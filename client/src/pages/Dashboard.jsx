import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import {
  AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineCalendar,
  AiOutlinePlus, AiOutlineClose, AiOutlineMessage, AiOutlineHistory,
  AiOutlineThunderbolt, AiOutlineRight
} from 'react-icons/ai';
import { BsCloudSun } from 'react-icons/bs';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { StatCardSkeleton, ListItemSkeleton, TaskCardSkeleton } from '../components/Skeleton';
import AiAssistant from '../components/AiAssistant';
import { AiOutlineUnorderedList } from 'react-icons/ai';
import { API } from '../api';
import '../styles/Dashboard.css';
import '../styles/AiAssistant.css';

const getLast7Days = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return days[d.getDay()];
  });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--sidebar-bg)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)'
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '2px 0', color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const PRIORITY_CONFIG = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '🔴 High' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '🟡 Medium' },
  low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '🟢 Low' },
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingVenue, setNewMeetingVenue] = useState('');
  const [showCharts, setShowCharts] = useState(
    () => localStorage.getItem('cd-show-charts') !== 'false'
  );


  const toggleCharts = () => {
    setShowCharts(prev => {
      localStorage.setItem('cd-show-charts', String(!prev));
      return !prev;
    });
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [productivityScore, setProductivityScore] = useState(0);
  useEffect(() => {
    if (tasks.length === 0) return;
    const completed = tasks.filter(t => t.status === 'done').length;
    const score = Math.round((completed / tasks.length) * 100);
    setProductivityScore(score);
  }, [tasks]);

  const [activityFeed, setActivityFeed] = useState([]);
  useEffect(() => {
    if (loading || !user) return;
    const allActivities = [
      ...tasks.map(t => ({ ...t, type: 'task', time: t.updatedAt || t.createdAt || new Date().toISOString() })),
      ...meetings.map(m => ({ ...m, type: 'meeting', time: m.dateTime || m.createdAt || new Date().toISOString() })),
      ...chats.flatMap(c => c.latestMessage ? [{
        ...c.latestMessage,
        type: 'message',
        time: c.latestMessage.createdAt || new Date().toISOString(),
        chatName: c.chatName || c.users?.find(u => u._id !== user?._id)?.username || 'Someone'
      }] : [])
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
    setActivityFeed(allActivities);
  }, [tasks, meetings, chats, loading, user]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, meetingsRes, chatsRes] = await Promise.all([
          axios.get(`${API}/api/tasks`),
          axios.get(`${API}/api/meetings`),
          axios.get(`${API}/api/chats`),
        ]);
        setTasks(tasksRes.data);
        setMeetings(meetingsRes.data);
        setChats(chatsRes.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Real-time Dashboard Updates
  const { socket } = useContext(AuthContext);
  useEffect(() => {
    if (!socket) return;

    const messageHandler = (newMsg) => {
      setChats(prev => {
        const chatExists = prev.find(c => c._id === newMsg.chatId._id);
        if (chatExists) {
          return prev.map(c => {
            if (c._id === newMsg.chatId._id) {
              return {
                ...c,
                latestMessage: newMsg,
                unreadCount: (c.unreadCount || 0) + 1
              };
            }
            return c;
          });
        } else {
          const newChat = { ...newMsg.chatId, latestMessage: newMsg, unreadCount: 1 };
          return [newChat, ...prev];
        }
      });
    };

    const markReadHandler = (data) => {
      setChats(prev => prev.map(c => {
        if (c._id === data.chatId) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      }));
    };

    socket.on("message_received", messageHandler);
    socket.on("mark_as_read", markReadHandler);
    return () => {
      socket.off("message_received", messageHandler);
      socket.off("mark_as_read", markReadHandler);
    };
  }, [socket]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await axios.post(`${API}/api/tasks`, {
        title: newTaskTitle,
        status: 'todo',
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      });
      setTasks(prev => [...prev, res.data]);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setShowTaskModal(false);
      toast.success('Task created!');
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    const orig = [...tasks];
    setTasks(tasks.map(t => t._id === id ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`${API}/api/tasks/${id}`, { status: newStatus });
    } catch (err) {
      setTasks(orig);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id) => {
    const orig = [...tasks];
    setTasks(tasks.filter(t => t._id !== id));
    try {
      await axios.delete(`${API}/api/tasks/${id}`);
      toast.success('Task deleted');
    } catch (err) {
      setTasks(orig);
      toast.error('Failed to delete task');
    }
  };

  const scheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/api/meetings`, {
        title: newMeetingTitle, dateTime: newMeetingDate, venue: newMeetingVenue
      });
      setMeetings(prev => [...prev, res.data]);
      setShowMeetingModal(false);
      setNewMeetingTitle(''); setNewMeetingDate(''); setNewMeetingVenue('');
      toast.success('Meeting scheduled!');
    } catch (err) {
      toast.error('Failed to schedule meeting');
    }
  };

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (source.droppableId !== destination.droppableId) updateTaskStatus(draggableId, destination.droppableId);
  };

  /* ── derived data ── */
  const sortTasks = (list) => list.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const todoTasks = sortTasks(tasks.filter(t => t.status === 'todo' || !t.status));
  const inProgressTasks = sortTasks(tasks.filter(t => t.status === 'in-progress'));
  const doneTasks = tasks.filter(t => t.status === 'done').sort((a, b) => new Date(b.updatedAt || b.createdAt || Date.now()) - new Date(a.updatedAt || a.createdAt || Date.now()));
  const totalUnread = chats.reduce((a, c) => a + (c.unreadCount || 0), 0);

  const upcomingMeetings = meetings
    .filter(m => m.dateTime && new Date(m.dateTime) >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  /* ── chart data ── */
  const days = getLast7Days();
  const activityData = days.map((day, i) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (6 - i));
    const dateStr = targetDate.toDateString();
    const completedCount = doneTasks.filter(t => {
      const d = t.updatedAt || t.createdAt;
      return d && new Date(d).toDateString() === dateStr;
    }).length;
    const msgCount = chats.reduce((acc, chat) => {
      if (chat.latestMessage && new Date(chat.latestMessage.createdAt).toDateString() === dateStr) return acc + 1;
      return acc;
    }, 0);
    return { day, tasks: completedCount, messages: msgCount };
  });

  const meetingsBarData = days.map((day, i) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (6 - i));
    const dateStr = targetDate.toDateString();
    const count = meetings.filter(m => m.dateTime && new Date(m.dateTime).toDateString() === dateStr).length;
    return { day, count };
  });

  const pieData = [
    { name: 'To Do', value: todoTasks.length || 1, color: '#6366f1' },
    { name: 'In Progress', value: inProgressTasks.length || 1, color: '#f59e0b' },
    { name: 'Done', value: doneTasks.length || 1, color: '#10b981' },
  ];

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const TaskCard = ({ task, index }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    return (
      <Draggable draggableId={task._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`task-card-premium ${snapshot.isDragging ? 'dragging' : ''}`}
            style={{
              ...provided.draggableProps.style,
              borderLeft: `4px solid ${task.status === 'done' ? 'var(--success)' : task.status === 'in-progress' ? 'var(--warning)' : 'var(--primary)'}`
            }}
          >
            <div className="task-card-header">
              <span className="task-card-title">{task.title}</span>
              <button onClick={() => deleteTask(task._id)} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', border: 'none', marginLeft: '8px' }}>✕</button>
            </div>

            <div className="task-card-meta">
              <div className="meta-item">
                <div className="task-priority-dot" style={{ color: pc.color }} />
                <span>{task.priority?.toUpperCase()}</span>
              </div>
              {task.dueDate && (
                <div className={`meta-item ${isOverdue ? 'overdue' : ''}`} title="Due Date">
                  <AiOutlineCalendar size={12} />
                  <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            <div className="task-card-footer">
              <button
                className="discuss-btn-pill"
                onClick={() => { window.dispatchEvent(new CustomEvent('discuss-task', { detail: task.title })); navigate('/chat'); }}
              >
                <AiOutlineMessage size={12} style={{ marginRight: 4 }} />
                Discuss
              </button>

              {task.status === 'done' && (
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <AiOutlineCheckCircle size={16} />
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const modalInputStyle = {
    width: '100%', padding: '0.8rem',
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    color: 'var(--text-primary)', borderRadius: 8, fontFamily: 'inherit',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-mesh-bg" />
      {/* Header */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="dashboard-header">
        <div className="header-left">
          <h1>Welcome back, <span className="highlight">{user?.username}</span>!</h1>
          <p>Your workspace is ready for action.</p>
        </div>

        <div className="header-right">
          {/* Weather & Time Widget */}
          <div className="weather-widget glass-panel">
            <div className="time-display">
              <span className="digital-clock">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="date-display">{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />
            <div className="weather-info">
              <div className="weather-icon"><BsCloudSun size={24} color="#f59e0b" /></div>
              <div className="weather-text">
                <span className="temp">24°C</span>
                <span className="condition">Partly Cloudy</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-secondary" onClick={toggleCharts}>
              {showCharts ? '📊 Hide Charts' : '📊 Show Charts'}
            </button>
            <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
              <AiOutlinePlus /> New Task
            </button>
          </div>
        </div>
      </motion.header>

      {/* Hero Stats Section */}
      <div className="dashboard-hero-row">
        {/* Productivity Score */}
        <div className="productivity-card glass-panel">
          <div className="prod-header">
            <h3>Productivity Score</h3>
            <AiOutlineThunderbolt color="#f59e0b" />
          </div>
          <div className="prod-gauge-wrapper">
            <div className="prod-gauge">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <circle className="gauge-bg" cx="50" cy="50" r="45" />
                <circle className="gauge-fill" cx="50" cy="50" r="45"
                  style={{ strokeDashoffset: 283 - (283 * productivityScore) / 100 }}
                  stroke="url(#gaugeGradient)"
                />
              </svg>
              <div className="gauge-text">
                <span className="score-num">{productivityScore}%</span>
                <span className="score-label">Efficiency</span>
              </div>
            </div>
          </div>
          <p className="prod-meta">You've completed {tasks.filter(t => t.status === 'done').length} out of {tasks.length} tasks this week.</p>
        </div>

        {/* Rapid Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="stats-grid-compact">
          <motion.div variants={itemVariants} className="mini-stat-card glass-panel" onClick={() => navigate('/chat')}>
            <div className="mini-icon pink"><AiOutlineMessage /></div>
            <div className="mini-content"><span>{totalUnread}</span><p>Unread</p></div>
          </motion.div>
          <motion.div variants={itemVariants} className="mini-stat-card glass-panel" onClick={() => navigate('/tasks')}>
            <div className="mini-icon blue"><AiOutlineCheckCircle /></div>
            <div className="mini-content"><span>{doneTasks.length}</span><p>Completed</p></div>
          </motion.div>
          <motion.div variants={itemVariants} className="mini-stat-card glass-panel" onClick={() => navigate('/calendar')}>
            <div className="mini-icon purple"><AiOutlineCalendar /></div>
            <div className="mini-content"><span>{upcomingMeetings.length}</span><p>Upcoming</p></div>
          </motion.div>
          <motion.div variants={itemVariants} className="mini-stat-card glass-panel" onClick={() => navigate('/tasks')} style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(0,0,0,0))' }}>
            <div className="mini-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><AiOutlineUnorderedList /></div>
            <div className="mini-content"><span>{tasks.filter(t => t.status !== 'done').length}</span><p>Pending</p></div>
          </motion.div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <AnimatePresence>
        {!loading && showCharts && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="charts-grid">
            <div className="chart-card glass-panel">
              <h3 className="chart-title">Activity (7 days)</h3>
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
                <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="tasks" name="Tasks" stroke="#6366f1" strokeWidth={2} fill="url(#colorTasks)" />
                  <Area type="monotone" dataKey="messages" name="Messages" stroke="#ec4899" strokeWidth={2} fill="url(#colorMsgs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-panel">
              <h3 className="chart-title">Task Breakdown</h3>
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-panel">
              <h3 className="chart-title">Meetings This Week</h3>
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
                <BarChart data={meetingsBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Meetings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Kanban Mini */}
        <motion.section initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="tasks-section glass-panel">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <h2 style={{ margin: 0 }}>Tasks Overview</h2>
              <div className="column-badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                {tasks.length} Total
              </div>
            </div>
            <Link
              to="/tasks"
              className="discuss-btn-pill"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Full Board <AiOutlineRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div className="kanban-board">
              <TaskCardSkeleton /><TaskCardSkeleton /><TaskCardSkeleton />
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="kanban-board">
                {[
                  { id: 'todo', label: 'To Do', items: todoTasks, color: 'var(--primary)', bg: 'rgba(99,102,241,0.05)' },
                  { id: 'in-progress', label: 'Working', items: inProgressTasks, color: 'var(--warning)', bg: 'rgba(245,158,11,0.05)' },
                  { id: 'done', label: 'Done', items: doneTasks, color: 'var(--success)', bg: 'rgba(16,185,129,0.05)' },
                ].map(col => (
                  <div key={col.id} className="kanban-column" style={{ background: col.bg }}>
                    <div className="column-header">
                      <h4 style={{ color: col.color }}>{col.label}</h4>
                      <span className="column-badge">{col.items.length}</span>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            minHeight: 120,
                            padding: snapshot.isDraggingOver ? '4px' : '0',
                            borderRadius: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {col.items.slice(0, 3).map((task, index) => <TaskCard key={task._id} task={task} index={index} />)}
                          {provided.placeholder}
                          {col.items.length === 0 && (
                            <div style={{
                              height: '100px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed rgba(255,255,255,0.03)',
                              borderRadius: '12px',
                              color: 'var(--text-muted)',
                              fontSize: '0.8rem'
                            }}>
                              Empty
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </motion.section>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Uncompleted To-Do */}
          <motion.section initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="todo-section glass-panel">
            <div className="section-header">
              <h2><AiOutlineUnorderedList /> Pending Tasks</h2>
              <button className="icon-btn" onClick={() => setShowTaskModal(true)} title="Add Task"><AiOutlinePlus /></button>
            </div>
            <div className="todo-list">
              {loading ? Array(3).fill(0).map((_, i) => <ListItemSkeleton key={i} />) : (() => {
                const pendingTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => {
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
                });
                return pendingTasks.length === 0
                  ? <div className="todo-empty">
                    <AiOutlineCheckCircle size={32} style={{ color: 'var(--success)', opacity: 0.6 }} />
                    <p>All caught up! 🎉</p>
                  </div>
                  : pendingTasks.slice(0, 5).map(task => (
                    <div key={task._id} className="todo-item" onClick={() => navigate('/tasks')}>
                      <div className="todo-priority-dot" style={{
                        background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e'
                      }} />
                      <div className="todo-info">
                        <h4>{task.title}</h4>
                        <div className="todo-meta">
                          <span className={`todo-status ${task.status}`}>
                            {task.status === 'in-progress' ? '⏳ In Progress' : '📋 To Do'}
                          </span>
                          {task.dueDate && (
                            <span className="todo-due">
                              {new Date(task.dueDate) < new Date() ? '🔴 ' : ''}
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <AiOutlineRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                  ));
              })()}
              {tasks.filter(t => t.status !== 'done').length > 5 && (
                <button className="todo-view-all" onClick={() => navigate('/tasks')}>
                  View all {tasks.filter(t => t.status !== 'done').length} pending tasks →
                </button>
              )}
            </div>
          </motion.section>

          {/* Activity Feed */}
          <motion.section initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="activity-section glass-panel">
            <div className="section-header">
              <h2><AiOutlineHistory /> Command Center</h2>
              <span className="live-tag">LIVE</span>
            </div>
            <div className="activity-feed">
              {activityFeed.map((activity, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-dot ${activity.type}`} />
                  <div className="activity-content">
                    <p>
                      <span className="activity-user">{activity.sender?.username || 'System'}</span>
                      {activity.type === 'message' && ` sent a message in ${activity.chatName}`}
                      {activity.type === 'task' && ` updated task: ${activity.title}`}
                      {activity.type === 'meeting' && ` scheduled: ${activity.title}`}
                    </p>
                    <span className="activity-time">
                      {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Meetings */}
          <motion.section initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="meetings-section glass-panel">
            <div className="section-header">
              <h2 onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>Upcoming</h2>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="icon-btn" title="View Full Calendar" onClick={() => navigate('/calendar')}><AiOutlineCalendar /></button>
                <button className="icon-btn" onClick={() => setShowMeetingModal(true)} title="Schedule"><AiOutlinePlus /></button>
              </div>
            </div>
            <div className="meetings-list">
              {loading ? Array(2).fill(0).map((_, i) => <ListItemSkeleton key={i} />) : (
                upcomingMeetings.length === 0
                  ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Clean slate for today!</p>
                  : upcomingMeetings.slice(0, 3).map(m => (
                    <div key={m._id} className="meeting-card-compact" onClick={() => navigate('/calendar')}>
                      <div className="m-time">{new Date(m.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="m-info">
                        <h4>{m.title}</h4>
                        <p>{m.venue || 'Online'}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </motion.section>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel" style={{ width: 440, padding: '2rem', background: 'var(--sidebar-bg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Add New Task</h3>
                <button onClick={() => setShowTaskModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}><AiOutlineClose /></button>
              </div>
              <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input autoFocus type="text" placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={modalInputStyle} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Priority</label>
                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ ...modalInputStyle, padding: '0.6rem' }}>
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Due Date (optional)</label>
                    <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} style={{ ...modalInputStyle, padding: '0.6rem' }} />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Create Task</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showMeetingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel" style={{ width: 440, padding: '2rem', background: 'var(--sidebar-bg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Schedule Meeting</h3>
                <button onClick={() => setShowMeetingModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}><AiOutlineClose /></button>
              </div>
              <form onSubmit={scheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="text" placeholder="Meeting title" value={newMeetingTitle} onChange={e => setNewMeetingTitle(e.target.value)} style={modalInputStyle} required />
                <input type="datetime-local" value={newMeetingDate} onChange={e => setNewMeetingDate(e.target.value)} style={modalInputStyle} required />
                <input type="text" placeholder="Venue or video link (e.g. https://meet.google.com/...)" value={newMeetingVenue} onChange={e => setNewMeetingVenue(e.target.value)} style={modalInputStyle} />
                <button type="submit" className="btn-primary">Schedule</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AiAssistant tasks={tasks} />
    </div>
  );
};

export default Dashboard;
