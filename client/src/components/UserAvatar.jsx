import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API } from '../api';

/**
 * UserAvatar — shows a user's avatar with an optional online status dot.
 * Props:
 *   user: { _id, username, avatar }
 *   size: number (px), default 36
 *   showStatus: boolean, default true
 */
const UserAvatar = ({ user, size = 36, showStatus = true }) => {
  const { onlineUsers } = useContext(AuthContext);
  const currentUserId = user?._id ? String(user._id) : null;
  const isOnline = showStatus && currentUserId && onlineUsers.some(id => id && String(id) === currentUserId);

  const containerStyle = {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    width: size,
    height: size,
    zIndex: 1
  };

  const imgStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(255,255,255,0.1)',
  };

  const placeholderStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.38,
    fontWeight: 700,
    color: 'white',
    border: '2px solid rgba(255,255,255,0.1)',
  };

  const dotSize = Math.max(10, size * 0.28);
  const dotStyle = {
    position: 'absolute',
    bottom: size * 0.05,
    right: size * 0.05,
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    background: isOnline ? '#22c55e' : '#475569',
    border: `2px solid var(--card-bg)`,
    boxShadow: isOnline ? '0 0 12px rgba(34, 197, 94, 0.7)' : 'none',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    zIndex: 10,
  };

  return (
    <div style={containerStyle}>
      {user?.avatar ? (
        <img
          src={`${API}/${user.avatar}`}
          alt={user?.username}
          style={imgStyle}
        />
      ) : (
        <div style={placeholderStyle}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      {showStatus && <span style={dotStyle} title={isOnline ? 'Online' : 'Offline'} />}
    </div>
  );
};

export default UserAvatar;
