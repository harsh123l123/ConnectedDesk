import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Whiteboard from './pages/Whiteboard';
import Resources from './pages/Resources';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute><Layout><Chat /></Layout></PrivateRoute>} />
            <Route path="/tasks" element={<PrivateRoute><Layout><Tasks /></Layout></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><Layout><Calendar /></Layout></PrivateRoute>} />
            <Route path="/whiteboard" element={<PrivateRoute><Layout><Whiteboard /></Layout></PrivateRoute>} />
            <Route path="/resources" element={<PrivateRoute><Layout><Resources /></Layout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
        <ToastContainer position="top-right" theme="colored" autoClose={4000} />
      </Router>
    </ThemeProvider>
  );
}

export default App;
