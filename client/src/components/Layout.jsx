import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AiOutlineHome, AiOutlineMessage, AiOutlineUser, AiOutlineSetting, AiOutlineMenu, AiOutlineClose, AiOutlineCalendar, AiOutlineLogout, AiOutlineCaretDown, AiOutlineCloud, AiOutlineUnorderedList, AiOutlineEdit } from 'react-icons/ai';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import CommandPalette from './CommandPalette';
import NotificationCenter from './NotificationCenter';
import { useTheme } from '../context/ThemeContext';
import PageTransition from './PageTransition';
import { API } from '../api';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  const { user, logout, notifications } = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="app-container">
      <CommandPalette />

      {/* Top Navbar */}
      <nav className="top-navbar">
        {/* Logo - Always Home */}
        <Link to="/" className="nav-brand">
          Connected Desk
        </Link>

        {/* Right Section: User Dropdown & Sidebar Trigger */}
        <div className="nav-right">
          {/* User Dropdown Trigger */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="user-trigger"
            >
              {user?.avatar ? (
                <img src={`${API}/${user.avatar}`} alt="Avatar" className="user-avatar-sm" />
              ) : (
                <div className="user-avatar-placeholder-sm">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="user-name">{user?.username}</span>
              <AiOutlineCaretDown size={12} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="dropdown-menu">
                <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="dropdown-link">
                  <AiOutlineUser size={18} /> Profile
                </Link>
                <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="dropdown-link">
                  <AiOutlineSetting size={18} /> Settings
                </Link>
                <div className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-link" style={{ color: '#fca5a5' }}>
                  <AiOutlineLogout size={18} /> Logout
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <MdOutlineLightMode size={20} /> : <MdOutlineDarkMode size={20} />}
          </button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Ctrl+K hint */}
          <button
            className="cmd-hint-btn"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            title="Command Palette (Ctrl+K)"
          >
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', opacity: 0.7 }}>⌘K</span>
          </button>

          {/* Sidebar Trigger (Mobile/Menu) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="menu-trigger"
          >
            <AiOutlineMenu size={22} />
          </button>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
      />

      {/* Sidebar Drawer */}
      <aside className={`sidebar-drawer ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <h3>Menu</h3>
          <button onClick={() => setSidebarOpen(false)} className="btn-close">
            <AiOutlineClose size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="sidebar-user-info">
          <div className="sidebar-avatar-container">
            {user?.avatar ? (
              <img src={`${API}/${user.avatar}`} alt="Avatar" className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar-placeholder">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{user?.username}</h4>
          <span className="user-email">{user?.email}</span>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <Link to="/" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <AiOutlineHome size={22} /> Dashboard
          </Link>
          <Link to="/tasks" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/tasks' ? 'active' : ''}`}>
            <AiOutlineUnorderedList size={22} /> Tasks
          </Link>
          <Link to="/calendar" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/calendar' ? 'active' : ''}`}>
            <AiOutlineCalendar size={22} /> Calendar
          </Link>
          <Link to="/resources" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/resources' ? 'active' : ''}`}>
            <AiOutlineCloud size={22} /> Drive
          </Link>
          <Link to="/whiteboard" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/whiteboard' ? 'active' : ''}`}>
            <AiOutlineEdit size={22} /> Whiteboard
          </Link>
          <Link to="/profile" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
            <AiOutlineUser size={22} /> My Profile
          </Link>
          <Link to="/chat" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}>
            <div className="nav-link-content">
              <AiOutlineMessage size={22} /> Chat
              {notifications.length > 0 && (
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </div>
          </Link>
          <Link to="/settings" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
            <AiOutlineSetting size={22} /> Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};

export default Layout;
