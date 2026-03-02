import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  AiOutlinePaperClip, AiOutlineClose, AiOutlineSend, AiOutlineUsergroupAdd,
  AiOutlineSearch, AiFillMessage, AiOutlineVideoCamera, AiOutlinePhone,
  AiOutlineArrowRight, AiOutlineArrowLeft, AiOutlineCheck, AiOutlineUser,
  AiOutlineTeam, AiOutlineEdit, AiOutlineDelete, AiOutlineLogout,
  AiOutlineInfoCircle, AiOutlineRollback, AiOutlinePushpin, AiFillPushpin,
  AiFillPushpin as AiFillPushpinIcon, AiOutlineFilePdf, AiOutlineFileWord,
  AiOutlineFileExcel, AiOutlineFileText, AiOutlineFileZip, AiOutlineCloudDownload, AiOutlineFile
} from 'react-icons/ai';
import { BsCheck2All, BsCheck2 } from 'react-icons/bs';
import { MdOutlineDraw } from 'react-icons/md';
import SimplePeer from 'simple-peer';
import UserAvatar from '../components/UserAvatar';
import { API } from '../api';
import '../styles/Chat.css';

var selectedChatCompare;

const Chat = () => {
  const { user, socket, notifications, setNotifications, onlineUsers } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // New Features State
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);

  // Video Call State
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  // Group Chat State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("👥");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupStep, setGroupStep] = useState(1);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResult, setGroupSearchResult] = useState([]);

  // Typing
  const [typingUser, setTypingUser] = useState('');

  // Emoji reactions
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Group Info Panel
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Message search
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');

  // Full Screen Image
  const [fullScreenImage, setFullScreenImage] = useState(null);

  // User Profile
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);


  const GROUP_ICONS = ["👥", "🚀", "💡", "🎯", "🔥", "💼", "🎨", "📊", "🛠️", "🌟", "🎉", "📚", "💬", "🤝", "⚡", "🌈", "🏆", "🔬", "🎮", "📱"];

  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const chatBottomRef = useRef(null);

  const isImage = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const getFileIcon = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <AiOutlineFilePdf size={30} color="#ef4444" />;
    if (['doc', 'docx'].includes(ext)) return <AiOutlineFileWord size={30} color="#2b579a" />;
    if (['xls', 'xlsx'].includes(ext)) return <AiOutlineFileExcel size={30} color="#1e7145" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <AiOutlineFileZip size={30} color="#f59e0b" />;
    if (ext === 'txt') return <AiOutlineFileText size={30} color="#64748b" />;
    return <AiOutlineFile size={30} color="var(--text-secondary)" />;
  };

  useEffect(() => {
    if (socket) {
      socket.on('connected', () => setSocketConnected(true));
      socket.on('typing', (data) => {
        setIsTyping(true);
        setTypingUser(data?.username || '');
      });
      socket.on('stop typing', () => { setIsTyping(false); setTypingUser(''); });
    }
  }, [socket]);

  useEffect(() => {
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (location.state?.selectedChatId && chats.length > 0) {
      const chatToSelect = chats.find(c => c._id === location.state.selectedChatId);
      if (chatToSelect) setSelectedChat(chatToSelect);
    }
  }, [chats, location.state]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      fetchPinnedMessages();
      selectedChatCompare = selectedChat;
      setReplyTo(null);
      setEditingMessage(null);
    }
  }, [selectedChat]);

  // Socket Listeners for Real-time features
  useEffect(() => {
    if (!socket) return;

    const messageHandler = (newMsg) => {
      // Update unread count in the chat list real-time
      setChats(prev => {
        const chatExists = prev.find(c => c._id === (newMsg.chatId?._id || newMsg.chatId));
        if (chatExists) {
          return prev.map(c => {
            if (c._id === (newMsg.chatId?._id || newMsg.chatId)) {
              const isCurrent = selectedChatCompare && selectedChatCompare._id === (newMsg.chatId?._id || newMsg.chatId);
              return {
                ...c,
                latestMessage: newMsg,
                unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1
              };
            }
            return c;
          });
        } else {
          // If the chat doesn't exist in our list (e.g. someone new messaged us), add it
          const newChat = {
            ...(typeof newMsg.chatId === 'object' ? newMsg.chatId : { _id: newMsg.chatId }),
            latestMessage: newMsg,
            unreadCount: 1
          };
          return [newChat, ...prev];
        }
      });

      if (!selectedChatCompare || selectedChatCompare._id !== (newMsg.chatId?._id || newMsg.chatId)) {
        // Notification logic handled in Context
      } else {
        setMessages(prev => {
          if (prev.find(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        markMessagesAsRead();
        // Scroll to bottom
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    const editHandler = (updatedMsg) => {
      if (selectedChatCompare && selectedChatCompare._id === updatedMsg.chatId) {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      }
    };

    const deleteHandler = (msgId) => {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '', fileUrl: '' } : m));
    };

    const pinHandler = (updatedMsg) => {
      if (selectedChatCompare && selectedChatCompare._id === updatedMsg.chatId) {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        if (updatedMsg.isPinned) {
          setPinnedMessages(prev => {
            if (prev.find(m => m._id === updatedMsg._id)) return prev;
            return [...prev, updatedMsg];
          });
        } else {
          setPinnedMessages(prev => prev.filter(m => m._id !== updatedMsg._id));
        }
      }
    };

    const markAsReadHandler = (data) => {
      if (selectedChatCompare && selectedChatCompare._id === data.chatId) {
        setMessages(prev => prev.map(m => {
          if (m.readBy && !m.readBy.some(u => u._id === data.user._id)) {
            return { ...m, readBy: [...m.readBy, data.user] };
          }
          return m;
        }));
      }
    };

    socket.on('message_received', messageHandler);
    socket.on('message_edited', editHandler);
    socket.on('message_deleted', deleteHandler);
    socket.on('message_pinned', pinHandler);
    socket.on('mark_as_read', markAsReadHandler);

    return () => {
      socket.off('message_received', messageHandler);
      socket.off('message_edited', editHandler);
      socket.off('message_deleted', deleteHandler);
      socket.off('message_pinned', pinHandler);
      socket.off('mark_as_read', markAsReadHandler);
    };
  }, [socket]);


  // Video Call Listeners
  useEffect(() => {
    if (!socket) return;
    const onCallUser = (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    };
    const onCallAccepted = (signal) => {
      setCallAccepted(true);
      if (connectionRef.current) connectionRef.current.signal(signal);
    };
    const onEndCall = () => endCallCleanup();
    socket.on('call_user', onCallUser);
    socket.on('call_accepted', onCallAccepted);
    socket.on('end_call', onEndCall);
    return () => {
      socket.off('call_user', onCallUser);
      socket.off('call_accepted', onCallAccepted);
      socket.off('end_call', onEndCall);
    };
  }, [socket]);

  // Discuss Task Listener
  useEffect(() => {
    const handleDiscussTask = (e) => {
      const taskTitle = e.detail;
      setNewMessage(`Let's discuss task: "${taskTitle}"... `);
      if (messageInputRef.current) messageInputRef.current.focus();
    };
    window.addEventListener('discuss-task', handleDiscussTask);
    return () => window.removeEventListener('discuss-task', handleDiscussTask);
  }, []);

  const fetchChats = async () => {
    try {
      const { data } = await axios.get(`${API}/api/chats`);
      setChats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedChat || !socket) return;
    try {
      await axios.put(`${API}/api/messages/read/${selectedChat._id}`);
      socket.emit('mark_as_read', {
        chatId: selectedChat._id,
        user: { _id: user._id, username: user.username, avatar: user.avatar },
        userIds: selectedChat.users.map(u => u._id)
      });
      // Clear local unread count
      setChats(prev => prev.map(c => c._id === selectedChat._id ? { ...c, unreadCount: 0 } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const { data } = await axios.get(`${API}/api/messages/${selectedChat._id}`);
      setMessages(data);
      if (socket) socket.emit('join_chat', selectedChat._id);
      markMessagesAsRead();
      setTimeout(() => chatBottomRef.current?.scrollIntoView(), 100);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPinnedMessages = async () => {
    if (!selectedChat) return;
    try {
      const { data } = await axios.get(`${API}/api/messages/pinned/${selectedChat._id}`);
      setPinnedMessages(data);
    } catch (error) { console.error(error); }
  };

  const sendReaction = async (messageId, emoji) => {
    try {
      const { data } = await axios.post(`${API}/api/messages/react/${messageId}`, { emoji });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: data } : m));
    } catch (err) {
      toast.error('Failed to add reaction');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API}/api/messages/${messageId}`);
      if (socket) socket.emit('message_deleted', { chatId: selectedChat._id, messageId });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true, content: '', fileUrl: '' } : m));
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const pinMessage = async (msg) => {
    try {
      const { data } = await axios.put(`${API}/api/messages/pin/${msg._id}`);
      if (socket) socket.emit('message_pinned', { chatId: selectedChat._id, message: data });

      setMessages(prev => prev.map(m => m._id === msg._id ? data : m));

      if (data.isPinned) {
        setPinnedMessages(prev => [...prev, data]);
        toast.success('Message pinned');
      } else {
        setPinnedMessages(prev => prev.filter(m => m._id !== msg._id));
        toast.success('Message unpinned');
      }
    } catch (err) {
      toast.error('Failed to pin message');
    }
  };

  const replyToMessage = (msg) => {
    setReplyTo(msg);
    if (messageInputRef.current) messageInputRef.current.focus();
  };

  const startEditMessage = (msg) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setReplyTo(null);
    if (messageInputRef.current) messageInputRef.current.focus();
  };

  const cancelEditOrReply = () => {
    setReplyTo(null);
    setEditingMessage(null);
    setNewMessage('');
    clearFile();
  };

  const renameGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const { data } = await axios.put(`${API}/api/chats/group/rename`, { chatId: selectedChat._id, chatName: newGroupName.trim() });
      setSelectedChat(data);
      setChats(prev => prev.map(c => c._id === data._id ? { ...c, chatName: data.chatName } : c));
      setRenameMode(false);
      toast.success('Group renamed!');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to rename group');
    }
  };

  const removeMember = async (userId) => {
    try {
      const { data } = await axios.put(`${API}/api/chats/group/remove`, { chatId: selectedChat._id, userId });
      const isSelf = userId === user._id;
      if (isSelf) {
        setChats(prev => prev.filter(c => c._id !== selectedChat._id));
        setSelectedChat(null);
        setShowGroupInfo(false);
        toast.success('You left the group');
      } else {
        setSelectedChat(data);
        toast.success('Member removed');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to remove member');
    }
  };

  const callUser = (id) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;
      const peer = new SimplePeer({ initiator: true, trickle: false, stream: currentStream });
      peer.on("signal", (data) => {
        socket.emit("call_user", { userToCall: id, signalData: data, from: user._id, name: user.username });
      });
      peer.on("stream", (currentStream) => { if (userVideo.current) userVideo.current.srcObject = currentStream; });
      connectionRef.current = peer;
    });
  };

  const answerCall = () => {
    setCallAccepted(true);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;
      const peer = new SimplePeer({ initiator: false, trickle: false, stream: currentStream });
      peer.on("signal", (data) => { socket.emit("answer_call", { signal: data, to: caller }); });
      peer.on("stream", (currentStream) => { if (userVideo.current) userVideo.current.srcObject = currentStream; });
      peer.signal(callerSignal);
      connectionRef.current = peer;
    });
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();
    if (caller) socket.emit("end_call", { to: caller });
    endCallCleanup();
  };

  const endCallCleanup = () => {
    setCallEnded(false);
    setReceivingCall(false);
    setCallAccepted(false);
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (e) => {
    if ((e.key === "Enter" || e.type === "click") && (newMessage.trim() || selectedFile)) {
      if (socket) socket.emit("stop typing", selectedChat._id);

      try {
        // EDIT MODE
        if (editingMessage) {
          const { data } = await axios.put(`${API}/api/messages/${editingMessage._id}`, { content: newMessage });
          if (socket) socket.emit('message_edited', { chatId: selectedChat._id, message: data });
          setMessages(prev => prev.map(m => m._id === editingMessage._id ? data : m));
          setEditingMessage(null);
          setNewMessage("");
          return;
        }

        // NEW MESSAGE MODE
        const formData = new FormData();
        formData.append("chatId", selectedChat._id);
        if (newMessage) formData.append("content", newMessage);
        if (selectedFile) formData.append("image", selectedFile);
        if (replyTo) formData.append("replyTo", replyTo._id);

        setNewMessage("");
        clearFile();
        setReplyTo(null);

        const config = { headers: { "Content-Type": "multipart/form-data" } };
        const { data } = await axios.post(`${API}/api/messages`, formData, config);

        if (socket) socket.emit('new_message', data);
        setMessages(prev => [...prev, data]);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (error) {
        console.error(error);
        toast.error('Failed operation');
      }
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    // Simple Mention Logic
    const lastWord = e.target.value.split(" ").pop();
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1));
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
    }

    if (!socket || !socketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit('typing', { room: selectedChat._id, username: user.username });
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    }, 3000);
  };

  const addMention = (username) => {
    const words = newMessage.split(" ");
    words.pop(); // remove the @part
    setNewMessage(words.join(" ") + ` @${username} `);
    setShowMentionList(false);
    messageInputRef.current.focus();
  };

  const handleSearch = async () => {
    if (!search) return;
    try {
      setLoadingChat(true);
      const { data } = await axios.get(`${API}/api/users?search=${search}`);
      setLoadingChat(false);
      setSearchResult(data);
    } catch (error) { setLoadingChat(false); }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const { data } = await axios.post(`${API}/api/chats`, { userId });
      setChats(prev => {
        if (!prev.find(c => c._id === data._id)) return [data, ...prev];
        return prev;
      });
      setSelectedChat(data);
      setNotifications(prev => prev.filter(n => n.chatId._id !== data._id));
      setLoadingChat(false);
      setSearchResult([]);
      setSearch('');
    } catch (error) { setLoadingChat(false); }
  };
  const getSender = (loggedUser, users) => {
    return String(users[0]._id) === String(loggedUser._id) ? users[1].username : users[0].username;
  };

  const handleGroupSearch = async (query) => {
    if (!query.trim()) { setGroupSearchResult([]); return; }
    try {
      setLoadingChat(true);
      const { data } = await axios.get(`${API}/api/users?search=${query}`);
      setLoadingChat(false);
      setGroupSearchResult(data);
    } catch (error) { setLoadingChat(false); }
  };

  const handleAddToGroup = (userToAdd) => {
    if (selectedUsers.some(u => u._id === userToAdd._id)) return;
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const handleRemoveFromGroup = (userToRemove) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userToRemove._id));
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    try {
      const { data } = await axios.post(`${API}/api/chats/group`, {
        name: `${groupIcon} ${groupName.trim()}`,
        users: JSON.stringify(selectedUsers.map(u => u._id))
      });
      setChats(prev => {
        if (!prev.find(c => c._id === data._id)) return [data, ...prev];
        return prev;
      });
      closeGroupModal();
      toast.success(`Group "${groupName}" created!`);
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setGroupName("");
    setGroupDescription("");
    setGroupIcon("👥");
    setSelectedUsers([]);
    setGroupSearchResult([]);
    setGroupSearchQuery("");
    setGroupStep(1);
    setShowIconPicker(false);
  };

  return (
    <div className={`chat-container glass-panel ${selectedChat ? 'has-selected-chat' : ''}`}>
      {/* Sidebar - User/Chat List */}
      <div className={`chat-sidebar ${selectedChat ? 'mobile-hide' : ''}`}>
        <div className="sidebar-header" style={{ background: 'var(--navbar-bg)', borderBottom: '1px solid var(--border)', padding: '0.8rem 1rem' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%', cursor: 'pointer' }}
            onClick={() => { setProfileUser(user); setProfileModalOpen(true); }}
          >
            <UserAvatar user={user} size={40} showStatus={true} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Chats</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.username} (You)</p>
            </div>
            <button className="add-group-btn" onClick={(e) => { e.stopPropagation(); setGroupStep(1); setShowGroupModal(true); }} title="Create Group"><AiOutlineUsergroupAdd size={22} /></button>
          </div>
        </div>
        <div className="sidebar-header">
          <div className="search-box">
            <input
              placeholder="Search User..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" || e.keyCode === 13) && handleSearch()}
            />
            <button onClick={handleSearch} className="search-btn"><AiOutlineSearch size={20} /></button>
          </div>
        </div>

        {loadingChat && <div style={{ padding: '1rem' }}>Loading...</div>}

        {searchResult.length > 0 && !showGroupModal ? (
          <div className="search-results">
            {searchResult.map(resUser => (
              <div key={resUser._id} className="user-list-item" onClick={() => accessChat(resUser._id)}>
                <p>{resUser.username}</p>
                <p style={{ fontSize: '0.8rem', color: 'gray' }}>{resUser.email}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="chat-list">
            {chats.map(chat => {
              const otherUser = !chat.isGroupChat
                ? chat.users.find(u => String(u._id) !== String(user._id))
                : null;
              const unreadCount = chat.unreadCount || 0;

              const latestMsg = chat.latestMessage;
              const isTypingThisChat = isTyping && typingUser && (
                chat.users.some(u => u.username === typingUser) ||
                (chat.isGroupChat && typingUser !== user.username)
              );

              return (
                <div
                  key={chat._id}
                  className={`chat-list-item ${selectedChat?._id === chat._id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedChat(chat);
                    setNotifications(notifications.filter(n => n.chatId._id !== chat._id));
                    // Also clear local unread count
                    setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', cursor: 'pointer', borderRadius: '12px' }}
                >
                  <div onClick={(e) => { e.stopPropagation(); if (otherUser) { setProfileUser(otherUser); setProfileModalOpen(true); } }}>
                    <UserAvatar user={otherUser || { username: chat.chatName }} size={45} showStatus={true} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.isGroupChat ? chat.chatName : (otherUser?.username || 'Chat')}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {latestMsg ? new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      {isTypingThisChat ? (
                        <span className="sidebar-typing">Typing...</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '85%' }}>
                          {latestMsg && latestMsg.sender._id === user._id && (
                            <span style={{ display: 'flex' }}>
                              {latestMsg.readBy?.filter(u => u._id !== user._id).length > 0 ? (
                                <BsCheck2All size={16} color="#34b7f1" />
                              ) : (
                                <BsCheck2 size={16} color="var(--text-muted)" />
                              )}
                            </span>
                          )}
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {latestMsg ? (latestMsg.content || 'Attachment') : 'New chat'}
                          </p>
                        </div>
                      )}
                      {unreadCount > 0 && (
                        <span style={{ background: '#25D366', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`chat-main ${!selectedChat ? 'mobile-hide' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            {/* ── Chat Header ── */}
            <div className="chat-main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <button
                  className="icon-btn mobile-back-btn"
                  onClick={() => setSelectedChat(null)}
                  style={{ marginRight: '0.5rem' }}
                >
                  <AiOutlineArrowLeft size={20} />
                </button>
                {selectedChat.isGroupChat ? (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    {selectedChat.chatName?.split(' ')[0]}
                  </div>
                ) : (
                  <div
                    style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => {
                      const otherUser = selectedChat.users.find(u => String(u._id) !== String(user._id));
                      if (otherUser) { setProfileUser(otherUser); setProfileModalOpen(true); }
                    }}
                  >
                    <UserAvatar user={selectedChat.users.find(u => String(u._id) !== String(user._id)) || {}} size={38} showStatus={true} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {!selectedChat.isGroupChat ? getSender(user, selectedChat.users) : selectedChat.chatName}
                  </h3>
                  {!selectedChat.isGroupChat && (() => {
                    const other = selectedChat.users.find(u => String(u._id) !== String(user._id));
                    const otherId = other?._id ? String(other._id) : null;
                    const isOtherOnline = otherId && onlineUsers.some(id => String(id) === otherId);
                    return <p style={{ margin: 0, fontSize: '0.72rem', color: isOtherOnline ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>{isOtherOnline ? '● Online' : '○ Offline'}</p>;
                  })()}
                  {selectedChat.isGroupChat && <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedChat.users.length} members</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button className="icon-btn" onClick={() => { setShowMsgSearch(s => !s); setMsgSearch(''); }} title="Search messages"><AiOutlineSearch size={20} /></button>
                <button className={`icon-btn ${showPinned ? 'active' : ''}`} onClick={() => setShowPinned(s => !s)} title="Pinned Messages" style={{ color: showPinned ? 'var(--primary)' : 'inherit' }}><AiOutlinePushpin size={20} /></button>
                <button className="icon-btn" title="Open Whiteboard" onClick={() => navigate('/whiteboard', { state: { chatId: selectedChat._id, chatName: !selectedChat.isGroupChat ? getSender(user, selectedChat.users) : selectedChat.chatName } })}><MdOutlineDraw size={20} /></button>
                {!selectedChat.isGroupChat && (
                  <button className="icon-btn" title="Video Call" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }} onClick={() => { const other = selectedChat.users.find(u => String(u._id) !== String(user._id)); if (other) callUser(other._id); }}>
                    <AiOutlineVideoCamera size={20} />
                  </button>
                )}
                {selectedChat.isGroupChat && (
                  <button className="icon-btn" title="Group Info" style={{ background: showGroupInfo ? 'rgba(99,102,241,0.2)' : undefined, color: showGroupInfo ? 'var(--primary)' : undefined }} onClick={() => { setShowGroupInfo(s => !s); setRenameMode(false); }}>
                    <AiOutlineInfoCircle size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Pinned Messages Header */}
            {showPinned && pinnedMessages.length > 0 && (
              <div style={{ background: 'var(--surface-light)', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 120, overflowY: 'auto' }}>
                <small style={{ fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><AiFillPushpin size={12} /> {pinnedMessages.length} Pinned Messages</small>
                {pinnedMessages.map((m, idx) => (
                  <div key={m._id || `pinned-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                      <strong style={{ color: 'var(--primary)' }}>{m.sender?.username || 'User'}:</strong> {m.content || 'Attachment'}
                    </span>
                    <button onClick={() => pinMessage(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><AiOutlineClose size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            {showMsgSearch && (
              <div style={{ padding: '0.5rem 1rem', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AiOutlineSearch color="var(--text-muted)" />
                <input autoFocus placeholder="Search messages..." value={msgSearch} onChange={e => setMsgSearch(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                <button onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><AiOutlineClose size={15} /></button>
              </div>
            )}

            {/* VIDEO CALL OVERLAY */}
            {(stream || receivingCall) && (
              <div className="video-call-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {callAccepted && !callEnded ? (
                    <video playsInline ref={userVideo} autoPlay style={{ width: '100%', maxHeight: '80%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ color: 'white', marginBottom: '2rem' }}>
                      {receivingCall && !callAccepted ? <h3>{name} is calling...</h3> : <h3>Calling...</h3>}
                    </div>
                  )}
                  {stream && (
                    <video playsInline muted ref={myVideo} autoPlay style={{
                      position: 'absolute', bottom: '20px', right: '20px',
                      width: '150px', borderRadius: '8px', border: '2px solid white'
                    }} />
                  )}
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', position: 'absolute', bottom: '50px' }}>
                    {receivingCall && !callAccepted && (
                      <button onClick={answerCall} style={{ background: '#10b981', color: 'white', padding: '1rem 2rem', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AiOutlinePhone /> Answer
                      </button>
                    )}
                    <button onClick={leaveCall} style={{ background: '#ef4444', color: 'white', padding: '1rem 2rem', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>End Call</button>
                  </div>
                </div>
              </div>
            )}

            <div className="messages-box">
              {messages
                .filter(m => !msgSearch || m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
                .map((m, i) => (
                  <div
                    key={m._id || i}
                    className={`message ${m.sender._id === user._id ? 'sent' : 'received'}`}
                    onMouseEnter={() => setHoveredMsg(m._id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                    style={{ position: 'relative', marginTop: 10, marginBottom: 10 }}
                  >
                    {/* Flex wrapper for Avatar + Bubble */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-end',
                      maxWidth: '100%',
                      flexDirection: m.sender._id === user._id ? 'row-reverse' : 'row'
                    }}>
                      {selectedChat.isGroupChat && m.sender._id !== user._id && (
                        <div style={{ marginBottom: '4px' }}>
                          <UserAvatar user={m.sender} size={28} showStatus={true} />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender._id === user._id ? 'flex-end' : 'flex-start' }}>
                        {/* Reply Context */}
                        {m.replyTo && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', borderLeft: '2px solid var(--primary)' }}>
                            <strong style={{ marginRight: 4 }}>{m.replyTo.sender?.username || 'User'}:</strong>
                            {m.replyTo.content ? (m.replyTo.content.substring(0, 30) + (m.replyTo.content.length > 30 ? '...' : '')) : 'Attachment'}
                          </div>
                        )}

                        {/* Sender Name for Group Chats */}
                        {selectedChat.isGroupChat && m.sender._id !== user._id && (
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 2, marginLeft: 4 }}>
                            {m.sender.username}
                          </div>
                        )}

                        {/* Message Content */}
                        <div className="message-bubble" style={{ position: 'relative' }}>
                          {m.isDeleted ? (
                            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}><AiOutlineDelete /> This message was deleted</span>
                          ) : (
                            <>
                              {m.fileUrl && (
                                isImage(m.fileUrl) ? (
                                  <img
                                    src={`${API}/${m.fileUrl}`}
                                    alt="attachment"
                                    className="message-image"
                                    onClick={() => setFullScreenImage(`${API}/${m.fileUrl}`)}
                                    style={{ cursor: 'zoom-in' }}
                                  />
                                ) : (
                                  <a
                                    href={`${API}/${m.fileUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-attachment"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '10px',
                                      background: 'rgba(0,0,0,0.1)',
                                      borderRadius: '12px',
                                      textDecoration: 'none',
                                      color: 'inherit',
                                      marginBottom: m.content ? '8px' : 0,
                                      border: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                  >
                                    {getFileIcon(m.fileUrl)}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {m.fileUrl.split('-').slice(1).join('-') || 'Document'}
                                      </p>
                                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Click to download</p>
                                    </div>
                                    <AiOutlineCloudDownload size={20} style={{ opacity: 0.7 }} />
                                  </a>
                                )
                              )}
                              {m.content && <span className="msg-content">{m.content}</span>}

                              <div className="message-info-meta">
                                <span className="message-time">
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {m.sender._id === user._id && (
                                  <span className={`message-status-ticks ${m.readBy?.filter(u => u._id !== user._id).length > 0 ? 'read' : ''}`}>
                                    {m.readBy?.filter(u => u._id !== user._id).length > 0 ? <BsCheck2All /> : <BsCheck2 />}
                                  </span>
                                )}
                              </div>

                              {m.isEdited && <span style={{ fontSize: '0.6rem', position: 'absolute', top: 2, right: 6, opacity: 0.5 }}>edited</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta info & Pin Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, justifyContent: m.sender._id === user._id ? 'flex-end' : 'flex-start' }}>
                      {m.isPinned && <AiFillPushpin size={10} color="#f59e0b" title="Pinned" />}
                    </div>

                    {/* Read Receipts */}
                    {m.sender._id === user._id && m.readBy?.filter(u => u._id !== user._id).length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 1, gap: 2 }}>
                        {m.readBy.filter(u => u._id !== user._id).slice(0, 5).map((u, idx) => (
                          <div key={u._id || `read-${idx}`} title={`Seen by ${u.username}`} style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                            {u.avatar ? (
                              <img src={`${API}/${u.avatar}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={u.username} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'var(--primary)', color: 'white', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {u.username ? u.username[0].toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                        ))}
                        {m.readBy.filter(u => u._id !== user._id).length > 5 && (
                          <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: 2 }}>+{m.readBy.filter(u => u._id !== user._id).length - 5}</span>
                        )}
                      </div>
                    )}

                    {/* HOVER ACTIONS - Only if not deleted */}
                    {hoveredMsg === m._id && !m.isDeleted && (
                      <div className="message-actions" style={{
                        position: 'absolute', top: -25, [m.sender._id === user._id ? 'right' : 'left']: 0,
                        background: 'var(--surface-light)', borderRadius: 20, padding: '2px 8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', gap: 8, zIndex: 10
                      }}>
                        <button onClick={() => sendReaction(m._id, '👍')} title="Like" className="action-btn">👍</button>
                        <button onClick={() => replyToMessage(m)} title="Reply" className="action-btn"><AiOutlineRollback size={14} /></button>
                        <button onClick={() => pinMessage(m)} title={m.isPinned ? "Unpin" : "Pin"} className="action-btn"><AiOutlinePushpin size={14} /></button>
                        {m.sender._id === user._id && (
                          <>
                            <button onClick={() => startEditMessage(m)} title="Edit" className="action-btn"><AiOutlineEdit size={14} /></button>
                            <button onClick={() => deleteMessage(m._id)} title="Delete" className="action-btn" style={{ color: '#ef4444' }}><AiOutlineDelete size={14} /></button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Reactions */}
                    {m.reactions && m.reactions.length > 0 && !m.isDeleted && (
                      <div className="message-reactions" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {m.reactions.map((r, idx) => (
                          <button key={r.emoji || `reaction-${idx}`} onClick={() => sendReaction(m._id, r.emoji)}
                            title={r.users.map(u => u.username || u).join(', ')}
                            style={{
                              background: r.users.some(u => (u._id || u) === user._id) ? 'rgba(99,102,241,0.25)' : 'var(--input-bg)',
                              border: '1px solid var(--border)', borderRadius: 12, padding: '1px 7px', cursor: 'pointer',
                              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-primary)'
                            }}>
                            {r.emoji} <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{r.users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              <div ref={chatBottomRef} />
            </div>

            <div className="message-input-container">
              {/* Context Banners: Reply or Edit */}
              {replyTo && (
                <div style={{ padding: '0.5rem 1rem', background: 'var(--surface-light)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Replying to <strong>{replyTo.sender?.username}</strong>: {replyTo.content?.substring(0, 50)}...
                  </div>
                  <button onClick={cancelEditOrReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><AiOutlineClose /></button>
                </div>
              )}
              {editingMessage && (
                <div style={{ padding: '0.5rem 1rem', background: 'rgba(245, 158, 11, 0.1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                    <AiOutlineEdit style={{ marginRight: 5 }} /> Editing message...
                  </div>
                  <button onClick={cancelEditOrReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><AiOutlineClose /></button>
                </div>
              )}

              {isTyping && (
                <div style={{ marginBottom: 5, marginLeft: 10, color: 'var(--primary)', fontStyle: 'italic', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1s ${i * 0.2}s infinite`, display: 'inline-block' }} />)}
                  </span>
                  {typingUser ? `${typingUser} is typing...` : 'Someone is typing...'}
                </div>
              )}

              {/* Mention List */}
              {showMentionList && selectedChat && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 20, background: 'var(--surface-light)',
                  border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 -4px 12px rgba(0,0,0,0.2)',
                  width: 200, maxHeight: 150, overflowY: 'auto', zIndex: 50
                }}>
                  {selectedChat.users?.filter(u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) && u._id !== user._id).map(u => (
                    <div key={u._id} onClick={() => addMention(u.username)}
                      style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}
                      className="mention-item">
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.7rem' }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      {u.username}
                    </div>
                  ))}
                </div>
              )}

              {/* File Preview removed from here as we use the Modal now */}

              <div className="message-input">
                <input
                  type="file"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <button className="icon-btn" onClick={() => fileInputRef.current.click()}><AiOutlinePaperClip size={20} /></button>
                <input
                  ref={messageInputRef}
                  placeholder={editingMessage ? "Edit your message..." : replyTo ? "Type your reply..." : "Type a message... (@ to mention)"}
                  value={newMessage}
                  onChange={typingHandler}
                  onKeyDown={sendMessage}
                />
                <button className={`icon-btn send-btn ${editingMessage ? 'edit-mode' : ''}`} onClick={sendMessage}>
                  {editingMessage ? <AiOutlineCheck size={20} /> : <AiOutlineSend size={20} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state-content">
              <div className="icon-wrapper"><AiFillMessage size={60} /></div>
              <h3>Welcome to ConnectedDesk</h3>
              <p>Select a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL & GROUP INFO PANEL CODE (Kept same logic, just ensuring it's in the file) */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeGroupModal()}>
          <div className="group-modal">
            {/* ... (Existing modal code logic reused) ... */}
            <div className="group-modal-header">
              <div className="group-modal-icon-wrap"><AiOutlineTeam size={20} /></div>
              <h3>Create Group</h3>
              <button className="group-modal-close" onClick={closeGroupModal}><AiOutlineClose size={18} /></button>
            </div>
            <div className="group-steps">
              <div className={`group-step ${groupStep >= 1 ? 'active' : ''} ${groupStep > 1 ? 'done' : ''}`}>
                <div className="step-circle">{groupStep > 1 ? <AiOutlineCheck size={12} /> : '1'}</div>
                <span>Group Info</span>
              </div>
              <div className={`group-step-line ${groupStep > 1 ? 'done' : ''}`} />
              <div className={`group-step ${groupStep >= 2 ? 'active' : ''}`}>
                <div className="step-circle">2</div>
                <span>Add Members</span>
              </div>
            </div>

            {groupStep === 1 && (
              <div className="group-modal-body" key="step1">
                <div className="group-icon-section">
                  <div className="group-icon-display" onClick={() => setShowIconPicker(!showIconPicker)}>
                    <span className="group-icon-emoji">{groupIcon}</span>
                    <div className="group-icon-badge">✎</div>
                  </div>
                  {showIconPicker && (
                    <div className="icon-picker-grid">
                      {GROUP_ICONS.map(icon => <button key={icon} className={`icon-picker-btn ${groupIcon === icon ? 'selected' : ''}`} onClick={() => { setGroupIcon(icon); setShowIconPicker(false); }}>{icon}</button>)}
                    </div>
                  )}
                </div>
                <div className="group-field">
                  <label className="group-label">Group Name <span className="required">*</span></label>
                  <input className="group-input" placeholder="e.g. Project Alpha..." value={groupName} onChange={(e) => setGroupName(e.target.value)} autoFocus />
                </div>
                <div className="group-modal-actions">
                  <button onClick={closeGroupModal} className="btn-secondary">Cancel</button>
                  <button onClick={() => setGroupStep(2)} className="btn-create" disabled={!groupName.trim()}>Next <AiOutlineArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {groupStep === 2 && (
              <div className="group-modal-body" key="step2">
                <div className="members-count-bar">
                  <span className="members-count-label"><AiOutlineUser size={14} />{selectedUsers.length} member(s) selected</span>
                </div>
                <div className="group-search-wrapper">
                  <div className="group-search-box">
                    <AiOutlineSearch size={16} />
                    <input className="group-search-input" placeholder="Search users..." value={groupSearchQuery} onChange={(e) => { setGroupSearchQuery(e.target.value); handleGroupSearch(e.target.value); }} autoFocus />
                  </div>
                  {groupSearchResult.length > 0 && (
                    <div className="search-results-dropdown">
                      {groupSearchResult.slice(0, 6).map(u => {
                        const isAdded = selectedUsers.some(s => s._id === u._id);
                        return (
                          <div key={u._id} className={`search-result-item enhanced ${isAdded ? 'already-added' : ''}`} onClick={() => !isAdded && handleAddToGroup(u)}>
                            <div className="result-avatar">{u.username[0].toUpperCase()}</div>
                            <div className="result-info"><p className="result-name">{u.username}</p><p className="result-email">{u.email}</p></div>
                            <div className="result-action">{isAdded ? <span className="added-badge"><AiOutlineCheck /> Added</span> : <span className="add-badge">+ Add</span>}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedUsers.length > 0 && (
                  <div className="selected-users-container">
                    {selectedUsers.map(u => (
                      <div key={u._id} className="user-pill">
                        <span className="pill-avatar">{u.username[0].toUpperCase()}</span>{u.username}
                        <button className="pill-remove" onClick={() => handleRemoveFromGroup(u)}><AiOutlineClose size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="group-modal-actions">
                  <button onClick={() => setGroupStep(1)} className="btn-secondary"><AiOutlineArrowLeft size={16} /> Back</button>
                  <button onClick={createGroupChat} className="btn-create" disabled={selectedUsers.length < 2}><AiOutlineCheck size={16} /> Create Group</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showGroupInfo && selectedChat?.isGroupChat && (
        <div style={{ width: 280, background: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Group Info</h4>
            <button onClick={() => setShowGroupInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><AiOutlineClose size={18} /></button>
          </div>
          <div style={{ padding: '1.5rem 1.2rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 0.75rem' }}>{selectedChat.chatName?.split(' ')[0]}</div>
            {renameMode ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameGroup()} style={{ flex: 1, background: 'var(--input-bg)', border: '1.5px solid var(--primary)', borderRadius: 8, padding: '0.4rem 0.6rem' }} />
                <button onClick={renameGroup} style={{ background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', padding: '0.4rem 0.6rem', cursor: 'pointer' }}><AiOutlineCheck size={16} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedChat.chatName}</span>
                {selectedChat.groupAdmin?._id === user._id && <button onClick={() => { setRenameMode(true); setNewGroupName(selectedChat.chatName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><AiOutlineEdit size={15} /></button>}
              </div>
            )}
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedChat.users.length} members &middot; Admin: {selectedChat.groupAdmin?.username}</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
            <p style={{ padding: '0 1.2rem', margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Members</p>
            {selectedChat.users.map(member => {
              const isAdminMember = selectedChat.groupAdmin?._id === member._id;
              const canKick = selectedChat.groupAdmin?._id === user._id && member._id !== user._id;
              const isSelf = member._id === user._id;
              return (
                <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1.2rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{member.username[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{member.username}{isSelf ? ' (you)' : ''}</p>
                    {isAdminMember && <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600 }}>Admin</span>}
                  </div>
                  {(canKick || isSelf) && <button onClick={() => removeMember(member._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelf ? '#f59e0b' : '#ef4444' }}>{isSelf ? <AiOutlineLogout size={16} /> : <AiOutlineDelete size={16} />}</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div className="modal-overlay" onClick={() => setFullScreenImage(null)} style={{ cursor: 'zoom-out', background: 'rgba(0,0,0,0.95)', zIndex: 10002 }}>
          <button onClick={() => setFullScreenImage(null)} style={{ position: 'absolute', top: 30, right: 30, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '10px', display: 'flex', cursor: 'pointer' }}>
            <AiOutlineClose size={24} />
          </button>
          <img src={fullScreenImage} alt="Full size" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* WhatsApp Style File Upload Modal */}
      {selectedFile && (
        <div className="modal-overlay" style={{ background: 'var(--background)', flexDirection: 'column', padding: 0, zIndex: 10001 }}>
          <div className="file-upload-header" style={{ width: '100%', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navbar-bg)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={clearFile} className="icon-btn"><AiOutlineClose size={20} /></button>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Preview</h3>
            </div>
          </div>
          <div className="file-upload-body" style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflow: 'hidden' }}>
            {isImage(selectedFile.name) ? (
              <img src={previewUrl} alt="upload preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                {getFileIcon(selectedFile.name)}
                <h4 style={{ marginTop: '1rem' }}>{selectedFile.name}</h4>
                <p style={{ color: 'var(--text-muted)' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
          <div className="file-upload-footer" style={{ width: '100%', padding: '2rem', background: 'var(--navbar-bg)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div className="message-input" style={{ width: '100%', maxWidth: '800px' }}>
              <input placeholder="Add a caption..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)} autoFocus style={{ padding: '1rem 1.5rem' }} />
              <button className="icon-btn send-btn" onClick={sendMessage} style={{ background: '#10b981', width: '50px', height: '50px' }}>
                <AiOutlineSend size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {profileModalOpen && profileUser && (
        <div className="modal-overlay" onClick={() => setProfileModalOpen(false)} style={{ zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content profile-modal" onClick={e => e.stopPropagation()} style={{ width: 400, padding: 0, overflow: 'hidden', borderRadius: 24, background: 'var(--background)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div className="profile-header-gradient" style={{ height: 160, background: 'linear-gradient(135deg, var(--primary), var(--accent))', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
              <button onClick={() => setProfileModalOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AiOutlineClose size={18} /></button>
              <div style={{ position: 'absolute', bottom: -50 }}>
                <div style={{ padding: 4, background: 'var(--background)', borderRadius: '50%' }}>
                  <UserAvatar user={profileUser} size={100} showStatus={false} />
                </div>
              </div>
            </div>
            <div style={{ padding: '70px 2rem 2.5rem', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>{profileUser.username}</h2>
              <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>{profileUser.role || 'Member'}</p>
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface-light)', borderRadius: 16 }}>
                  <AiOutlineInfoCircle size={22} color="var(--primary)" />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profileUser.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface-light)', borderRadius: 16 }}>
                  <AiOutlineTeam size={22} color="var(--accent)" />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Since</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>February 2026</p>
                  </div>
                </div>
              </div>
              {profileUser._id !== user._id && (
                <button onClick={() => { accessChat(profileUser._id); setProfileModalOpen(false); }} style={{ marginTop: '2.5rem', width: '100%', padding: '1rem', borderRadius: 16, background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <AiFillMessage size={20} /> Send Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
