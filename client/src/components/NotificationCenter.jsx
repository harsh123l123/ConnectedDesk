import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AiOutlineBell } from 'react-icons/ai';
import '../styles/NotificationCenter.css';

const NotificationCenter = () => {
  const { notifications, setNotifications } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notif) => {
    setOpen(false);
    // Remove this notification
    setNotifications(prev => prev.filter(n => n._id !== notif._id));
    // Navigate to the chat that generated it
    navigate('/chat', { state: { selectedChatId: notif.chatId?._id } });
  };

  const clearAll = () => setNotifications([]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button className="notif-trigger" onClick={() => setOpen(o => !o)} title="Notifications">
        <AiOutlineBell size={20} />
        {notifications.length > 0 && <span className="notif-dot" />}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <h4>Notifications {notifications.length > 0 && `(${notifications.length})`}</h4>
            {notifications.length > 0 && (
              <button className="notif-clear-btn" onClick={clearAll}>Clear all</button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <p>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className="notif-item"
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-avatar">
                    {notif.sender?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="notif-body">
                    <div className="notif-sender">{notif.sender?.username}</div>
                    <div className="notif-text">
                      {notif.content
                        ? (notif.content.length > 60 ? notif.content.substring(0, 60) + '…' : notif.content)
                        : 'Sent an attachment'}
                    </div>
                    <div className="notif-time">{formatTime(notif.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
