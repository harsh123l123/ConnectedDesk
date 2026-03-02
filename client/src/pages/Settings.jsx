import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  AiOutlineLogout, AiOutlineBell, AiOutlineInfoCircle,
  AiOutlineUser, AiOutlineLock, AiOutlineDelete,
  AiOutlineMessage, AiOutlineLayout, AiOutlineCode,
  AiOutlineGlobal, AiOutlineDownload
} from 'react-icons/ai';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

/* ── Reusable sub-components ── */
const SectionTitle = ({ children }) => (
  <h3 style={{
    margin: '0 0 0.5rem 0', fontSize: '0.72rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)'
  }}>{children}</h3>
);

const SettingRow = ({ icon, title, description, children, last = false }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.1rem 0', borderBottom: last ? 'none' : '1px solid var(--border)', gap: '1rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'rgba(99,102,241,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--primary)', flexShrink: 0
      }}>{icon}</div>
      <div>
        <h4 style={{ margin: 0, fontSize: '0.93rem', color: 'var(--text-primary)', fontWeight: 600 }}>{title}</h4>
        {description && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, flexShrink: 0 }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
    <span style={{
      position: 'absolute', cursor: 'pointer', inset: 0,
      background: checked ? 'var(--primary)' : 'var(--surface-light)',
      borderRadius: 34, transition: '0.3s',
      boxShadow: checked ? '0 0 12px rgba(99,102,241,0.4)' : 'none'
    }}>
      <span style={{
        position: 'absolute', height: 20, width: 20,
        left: checked ? 28 : 4, bottom: 4,
        background: 'white', borderRadius: '50%',
        transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </span>
  </label>
);

const SelectInput = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: 'var(--input-bg)', border: '1px solid var(--input-border)',
      color: 'var(--text-primary)', borderRadius: 8, padding: '0.4rem 0.8rem',
      fontSize: '0.85rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit'
    }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Card = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-panel"
    style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}
  >
    {children}
  </motion.div>
);

/* ── Keyboard shortcut badge ── */
const Kbd = ({ keys }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {keys.map((k, i) => (
      <span key={i} style={{
        background: 'var(--surface-light)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem',
        fontFamily: 'monospace', color: 'var(--text-secondary)', fontWeight: 600
      }}>{k}</span>
    ))}
  </div>
);

/* ══════════════════════════════════════════ */
const Settings = () => {
  const { logout, user } = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Appearance
  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem('cd-font-size') || 'medium'
  );

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(
    () => localStorage.getItem('cd-notif') !== 'false'
  );
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('cd-sound') === 'true'
  );
  const [desktopNotif, setDesktopNotif] = useState(false);

  // Dashboard
  const [showCharts, setShowCharts] = useState(
    () => localStorage.getItem('cd-show-charts') !== 'false'
  );
  const [compactMode, setCompactMode] = useState(
    () => localStorage.getItem('cd-compact') === 'true'
  );

  // Chat
  const [enterToSend, setEnterToSend] = useState(
    () => localStorage.getItem('cd-enter-send') !== 'false'
  );
  const [showTimestamps, setShowTimestamps] = useState(
    () => localStorage.getItem('cd-timestamps') !== 'false'
  );
  const [messagePreview, setMessagePreview] = useState(
    () => localStorage.getItem('cd-msg-preview') !== 'false'
  );

  // Privacy
  const [onlineStatus, setOnlineStatus] = useState(
    () => localStorage.getItem('cd-online-status') !== 'false'
  );
  const [readReceipts, setReadReceipts] = useState(
    () => localStorage.getItem('cd-read-receipts') !== 'false'
  );

  /* ── Persist helpers ── */
  const persist = (key, value) => localStorage.setItem(key, String(value));

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleClearCache = () => {
    const keys = ['cd-show-charts', 'cd-compact', 'cd-font-size'];
    keys.forEach(k => localStorage.removeItem(k));
    toast.success('Cache cleared! Refresh to apply.');
  };

  const handleExportData = () => {
    const data = {
      user: user?.username,
      exportedAt: new Date().toISOString(),
      settings: {
        theme: isDark ? 'dark' : 'light',
        fontSize, notifEnabled, soundEnabled,
        showCharts, compactMode, enterToSend,
        showTimestamps, messagePreview, onlineStatus, readReceipts
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'connected-desk-settings.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported!');
  };

  const requestDesktopNotif = async () => {
    if (!('Notification' in window)) {
      toast.error('Desktop notifications not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDesktopNotif(true);
      toast.success('Desktop notifications enabled!');
      new Notification('Connected Desk', { body: 'Notifications are now active ✅' });
    } else {
      toast.error('Permission denied for notifications.');
    }
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    persist('cd-font-size', size);
    const map = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = map[size];
    toast.success(`Font size set to ${size}`);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, margin: 0,
          background: 'linear-gradient(to right, var(--primary), var(--secondary))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Manage your preferences — changes save automatically
        </p>
      </motion.div>

      {/* ── 1. Appearance ── */}
      <Card delay={0.05}>
        <SectionTitle>🎨 Appearance</SectionTitle>
        <SettingRow
          icon={isDark ? <MdOutlineDarkMode size={20} /> : <MdOutlineLightMode size={20} />}
          title={isDark ? 'Dark Mode' : 'Light Mode'}
          description={isDark ? 'Switch to a bright, clean light theme' : 'Switch to a sleek dark theme'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isDark ? '🌙 Dark' : '☀️ Light'}
            </span>
            <Toggle checked={!isDark} onChange={toggleTheme} />
          </div>
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1rem', fontWeight: 700 }}>Aa</span>}
          title="Font Size"
          description="Adjust the text size across the app"
          last
        >
          <SelectInput
            value={fontSize}
            onChange={applyFontSize}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </SettingRow>
      </Card>

      {/* ── 2. Dashboard ── */}
      <Card delay={0.1}>
        <SectionTitle>📊 Dashboard</SectionTitle>
        <SettingRow
          icon={<AiOutlineLayout size={20} />}
          title="Show Analytics Charts"
          description="Display activity, task breakdown, and meetings charts"
        >
          <Toggle checked={showCharts} onChange={() => {
            const next = !showCharts;
            setShowCharts(next);
            persist('cd-show-charts', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1rem' }}>⚡</span>}
          title="Compact Mode"
          description="Reduce spacing for a denser information layout"
          last
        >
          <Toggle checked={compactMode} onChange={() => {
            const next = !compactMode;
            setCompactMode(next);
            persist('cd-compact', next);
            document.body.classList.toggle('compact-mode', next);
            toast.success(next ? 'Compact mode on' : 'Compact mode off');
          }} />
        </SettingRow>
      </Card>

      {/* ── 3. Notifications ── */}
      <Card delay={0.15}>
        <SectionTitle>🔔 Notifications</SectionTitle>
        <SettingRow
          icon={<AiOutlineBell size={20} />}
          title="In-App Notifications"
          description="Show notification bell alerts inside the app"
        >
          <Toggle checked={notifEnabled} onChange={() => {
            const next = !notifEnabled;
            setNotifEnabled(next);
            persist('cd-notif', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1.1rem' }}>🔊</span>}
          title="Sound Effects"
          description="Play a sound when a new message arrives"
        >
          <Toggle checked={soundEnabled} onChange={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            persist('cd-sound', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1.1rem' }}>🖥️</span>}
          title="Desktop Notifications"
          description="Get browser push notifications even when tab is in background"
          last
        >
          <button
            onClick={requestDesktopNotif}
            style={{
              background: desktopNotif ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
              color: desktopNotif ? 'var(--success)' : 'var(--primary)',
              border: `1px solid ${desktopNotif ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
              borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
            }}
          >
            {desktopNotif ? '✅ Enabled' : 'Enable'}
          </button>
        </SettingRow>
      </Card>

      {/* ── 4. Chat Preferences ── */}
      <Card delay={0.2}>
        <SectionTitle>💬 Chat Preferences</SectionTitle>
        <SettingRow
          icon={<AiOutlineMessage size={20} />}
          title="Enter to Send"
          description="Press Enter to send messages (Shift+Enter for new line)"
        >
          <Toggle checked={enterToSend} onChange={() => {
            const next = !enterToSend;
            setEnterToSend(next);
            persist('cd-enter-send', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1rem' }}>🕐</span>}
          title="Show Timestamps"
          description="Display time next to each message"
        >
          <Toggle checked={showTimestamps} onChange={() => {
            const next = !showTimestamps;
            setShowTimestamps(next);
            persist('cd-timestamps', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<span style={{ fontSize: '1rem' }}>👁️</span>}
          title="Message Preview"
          description="Show message content in notification previews"
          last
        >
          <Toggle checked={messagePreview} onChange={() => {
            const next = !messagePreview;
            setMessagePreview(next);
            persist('cd-msg-preview', next);
          }} />
        </SettingRow>
      </Card>

      {/* ── 5. Privacy ── */}
      <Card delay={0.25}>
        <SectionTitle>🔒 Privacy</SectionTitle>
        <SettingRow
          icon={<AiOutlineGlobal size={20} />}
          title="Show Online Status"
          description="Let others see when you're active"
        >
          <Toggle checked={onlineStatus} onChange={() => {
            const next = !onlineStatus;
            setOnlineStatus(next);
            persist('cd-online-status', next);
          }} />
        </SettingRow>

        <SettingRow
          icon={<AiOutlineLock size={20} />}
          title="Read Receipts"
          description="Show others when you've read their messages"
          last
        >
          <Toggle checked={readReceipts} onChange={() => {
            const next = !readReceipts;
            setReadReceipts(next);
            persist('cd-read-receipts', next);
          }} />
        </SettingRow>
      </Card>

      {/* ── 6. Keyboard Shortcuts ── */}
      <Card delay={0.3}>
        <SectionTitle>⌨️ Keyboard Shortcuts</SectionTitle>
        {[
          { label: 'Command Palette', keys: ['Ctrl', 'K'] },
          { label: 'Go to Dashboard', keys: ['Ctrl', '1'] },
          { label: 'Go to Chat', keys: ['Ctrl', '2'] },
          { label: 'Go to Tasks', keys: ['Ctrl', '3'] },
          { label: 'Toggle Theme', keys: ['Ctrl', 'Shift', 'T'] },
          { label: 'Close Modal / Esc', keys: ['Esc'] },
        ].map((s, i, arr) => (
          <SettingRow
            key={s.label}
            icon={<AiOutlineCode size={18} />}
            title={s.label}
            last={i === arr.length - 1}
          >
            <Kbd keys={s.keys} />
          </SettingRow>
        ))}
      </Card>

      {/* ── 7. Data Management ── */}
      <Card delay={0.35}>
        <SectionTitle>🗄️ Data Management</SectionTitle>
        <SettingRow
          icon={<AiOutlineDownload size={20} />}
          title="Export Settings"
          description="Download your preferences as a JSON file"
        >
          <button
            onClick={handleExportData}
            style={{
              background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
            }}
          >
            Export
          </button>
        </SettingRow>

        <SettingRow
          icon={<AiOutlineDelete size={20} />}
          title="Clear App Cache"
          description="Reset cached preferences and local data"
          last
        >
          <button
            onClick={handleClearCache}
            style={{
              background: 'rgba(239,68,68,0.08)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
            }}
          >
            Clear
          </button>
        </SettingRow>
      </Card>

      {/* ── 8. About ── */}
      <Card delay={0.4}>
        <SectionTitle>ℹ️ About</SectionTitle>
        <SettingRow
          icon={<AiOutlineInfoCircle size={20} />}
          title="Connected Desk"
          description="Version 1.0.0 — A modern real-time collaboration platform"
          last
        >
          <span style={{
            background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
            padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600
          }}>v1.0.0</span>
        </SettingRow>
      </Card>

      {/* ── Logout ── */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        onClick={handleLogout}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        style={{
          width: '100%', padding: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
          fontSize: '1rem', fontWeight: 600,
          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
      >
        <AiOutlineLogout size={20} /> Log Out
      </motion.button>
    </div>
  );
};

export default Settings;
