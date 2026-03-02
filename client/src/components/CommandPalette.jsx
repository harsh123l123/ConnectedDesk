import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  AiOutlineSearch, AiOutlineArrowRight, AiOutlineHome, AiOutlineMessage,
  AiOutlineCalendar, AiOutlineCloud, AiOutlineUser, AiOutlineSetting,
  AiOutlineFile, AiOutlineFolderOpen, AiOutlineThunderbolt
} from 'react-icons/ai';
import { API } from '../api';
import '../styles/CommandPalette.css';

const CommandPalette = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Static Navigation Items
  const navItems = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', subtitle: 'View your tasks and overview', icon: <AiOutlineHome />, path: '/', type: 'navigation' },
    { id: 'nav-chat', title: 'Go to Chat', subtitle: 'Messages and team collaboration', icon: <AiOutlineMessage />, path: '/chat', type: 'navigation' },
    { id: 'nav-tasks', title: 'Go to Tasks', subtitle: 'Kanban board and todos', icon: <AiOutlineCalendar />, path: '/tasks', type: 'navigation' },
    { id: 'nav-drive', title: 'Go to Drive', subtitle: 'Shared files and resources', icon: <AiOutlineCloud />, path: '/resources', type: 'navigation' },
    { id: 'nav-profile', title: 'My Profile', subtitle: 'View and edit profile', icon: <AiOutlineUser />, path: '/profile', type: 'navigation' },
    { id: 'nav-settings', title: 'Settings', subtitle: 'App preferences', icon: <AiOutlineSetting />, path: '/settings', type: 'navigation' },
  ];

  // Fetch dynamic data (chats, tasks, resources)
  const fetchDynamicData = useCallback(async () => {
    setLoading(true);
    let dynamicItems = [];
    try {
      const [chatsRes, tasksRes, resourceRes] = await Promise.allSettled([
        axios.get(`${API}/api/chats`),
        axios.get(`${API}/api/tasks`),
        axios.get(`${API}/api/resources`)
      ]);

      if (chatsRes.status === 'fulfilled') {
        const chatItems = chatsRes.value.data.map(chat => ({
          id: `chat-${chat._id}`,
          title: chat.isGroupChat ? chat.chatName : chat.users.find(u => u._id !== user?._id)?.username || 'Chat',
          subtitle: chat.latestMessage ? `Last: ${chat.latestMessage.content.substring(0, 30)}...` : 'No messages yet',
          icon: <AiOutlineMessage />,
          path: '/chat',
          state: { selectedChatId: chat._id },
          category: 'Chats'
        }));
        dynamicItems = [...dynamicItems, ...chatItems];
      }

      if (tasksRes.status === 'fulfilled') {
        const taskItems = tasksRes.value.data.map(task => ({
          id: `task-${task._id}`,
          title: task.title,
          subtitle: `Status: ${task.status} | Priority: ${task.priority}`,
          icon: <AiOutlineCalendar />,
          path: '/tasks',
          category: 'Tasks'
        }));
        dynamicItems = [...dynamicItems, ...taskItems];
      }

      if (resourceRes.status === 'fulfilled') {
        const resourceItems = resourceRes.value.data.map(res => ({
          id: `resource-${res._id}`,
          title: res.title,
          subtitle: res.description || 'Shared Resource',
          icon: <AiOutlineFile />,
          path: '/resources',
          category: 'Resources'
        }));
        dynamicItems = [...dynamicItems, ...resourceItems];
      }

    } catch (err) {
      console.error("Failed to fetch command palette data", err);
    }
    setLoading(false);
    return dynamicItems;
  }, [user]);


  // Filter items based on query
  useEffect(() => {
    const filterItems = async () => {
      let allItems = navItems;
      if (isOpen && query.length > 0) {
        // If getting complicated, we can debounce this
      }

      // Perform local filtering
      const lowerQuery = query.toLowerCase();
      let filtered = allItems.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle.toLowerCase().includes(lowerQuery)
      );

      // If we have dynamic data loaded (stored in a ref or state? tricky with async)
      // For simplicity, we fetch once on open, and store in a separate state "dynamicData"
      // But let's just stick to static + filtered for MVP speed or do a real-time fetch if query length > 2?
      // Better: Fetch all on open, store in memory, then filter locally.

      setItems(filtered);
      setSelectedIndex(0);
    };

    if (isOpen) {
      filterItems();
    }
  }, [isOpen, query]);


  // Initial Data Load on Open
  const [pdfData, setPdfData] = useState([]);
  useEffect(() => {
    if (isOpen) {
      fetchDynamicData().then(data => {
        setPdfData(data);
      });
    }
  }, [isOpen, fetchDynamicData]);

  // Merge static and dynamic for rendering
  useEffect(() => {
    if (!isOpen) return;

    const lowerQuery = query.toLowerCase();
    const navItemsWithCat = navItems.map(i => ({ ...i, category: 'Navigation' }));
    const combined = [...navItemsWithCat, ...pdfData];

    const filtered = combined.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.subtitle.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 12);

    setItems(filtered);
    setSelectedIndex(0);
  }, [query, pdfData, isOpen]);

  // Command Action Hook (Alt+A) - Future proofing
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K for Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Keyboard Navigation inside Modal
  useEffect(() => {
    const handleNav = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [isOpen, items, selectedIndex]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.path, { state: item.state });
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <AiOutlineSearch size={20} color="var(--text-secondary)" />
          <input
            ref={inputRef}
            autoFocus
            className="cmd-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Esc</button>
        </div>

        <div className="cmd-list" ref={listRef}>
          {loading && items.length === 0 && (
            <div className="cmd-loader">
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <p>Fetching team data...</p>
            </div>
          )}

          {items.map((item, index) => (
            <div key={item.id}>
              {/* Category Header */}
              {(index === 0 || items[index - 1].category !== item.category) && (
                <div className="cmd-group-heading">{item.category}</div>
              )}

              <div
                className={`cmd-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="cmd-item-icon">{item.icon}</div>
                <div className="cmd-item-content">
                  <span className="cmd-item-title">{item.title}</span>
                  <span className="cmd-item-subtitle">{item.subtitle}</span>
                </div>
                <div className="cmd-item-status">
                  {index === selectedIndex ? <span className="cmd-enter-tag">↵ Enter</span> : null}
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No results found.
            </div>
          )}
        </div>

        <div className="cmd-footer">
          <span><span className="kbd-shortcut">↑↓</span> to navigate</span>
          <span><span className="kbd-shortcut">↵</span> to select</span>
          <span><span className="kbd-shortcut">esc</span> to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
