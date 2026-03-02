import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from "socket.io-client";
import { toast } from 'react-toastify';
import { API } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]); // Track online user IDs

  // Normalize user object to always have _id
  const normalizeUser = (u) => {
    if (!u) return null;
    if (!u._id && u.id) u._id = u.id;
    return u;
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['auth-token'] = token;
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = normalizeUser(JSON.parse(storedUser));
        if (parsed && parsed._id) {
          setUser(parsed);
        } else {
          // User data is corrupt/incomplete — force re-login
          console.warn('[Auth] Stored user missing _id, clearing session');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
    } else {
      delete axios.defaults.headers.common['auth-token'];
      setUser(null);
    }

    // Interceptor to handle token expiration (400/401)
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 400)) {
          const msg = error.response.data;
          if (msg === "Invalid Token" || msg === "Access Denied" || (typeof msg === 'object' && msg.msg === "Invalid Token")) {
            logout();
            toast.error("Session expired. Please login again.");
          }
        }
        return Promise.reject(error);
      }
    );

    setLoading(false);
    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  useEffect(() => {
    if (user) {
      const newSocket = io(API);
      setSocket(newSocket);
      newSocket.on("connect", () => {
        newSocket.emit("setup", user);
      });

      newSocket.on("connect_error", (err) => {
        console.error('[Socket] Connection Error:', err.message);
      });

      // Online users tracking
      newSocket.on("online_users", (userIds) => {
        setOnlineUsers(Array.isArray(userIds) ? userIds : []);
      });

      // Global Message Listener for Notifications
      newSocket.on("message_received", (newMessageReceived) => {
        const currentPath = window.location.pathname;

        setNotifications(prev => {
          if (prev.find(n => n._id === newMessageReceived._id)) return prev;
          return [newMessageReceived, ...prev];
        });

        if (!currentPath.includes('/chat')) {
          const senderName = newMessageReceived.sender.username;
          const content = newMessageReceived.content
            ? (newMessageReceived.content.length > 50
              ? newMessageReceived.content.substring(0, 50) + "..."
              : newMessageReceived.content)
            : "Sent an attachment";

          toast.info(`💬 ${senderName}: ${content}`, {
            onClick: () => { navigate('/chat'); }
          });
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const userData = normalizeUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post(`${API}/api/auth/register`, { username, email, password });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setNotifications([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, register, logout, loading,
      socket, notifications, setNotifications,
      onlineUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};
