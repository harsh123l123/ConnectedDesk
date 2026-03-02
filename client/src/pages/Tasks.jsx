import { useState, useContext, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import {
  AiOutlinePlus, AiOutlineCalendar, AiOutlineUser,
  AiOutlineDelete, AiOutlineMessage, AiOutlineClose,
  AiOutlineSearch, AiOutlineFlag, AiOutlineEdit,
  AiOutlineCheckSquare, AiOutlineComment, AiOutlineClockCircle,
  AiOutlineUsergroupAdd, AiOutlineCheck, AiOutlineSync
} from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../api';
import UserAvatar from '../components/UserAvatar';
import AiAssistant from '../components/AiAssistant';
import '../styles/Tasks.css';

const PRIORITY_CONFIG = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'High', dot: '🔴' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium', dot: '🟡' },
  low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Low', dot: '🟢' },
};

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // For assignment
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // If set, we are editing/viewing details

  // Form State
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'medium', dueDate: '',
    assignedTo: [], recurring: { enabled: false, frequency: 'weekly' }
  });

  // Subtask & Comment Inputs
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API}/api/tasks`);
      setTasks(res.data);
    } catch (err) { toast.error('Failed to load tasks'); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/api/users`);
      setUsers(data);
    } catch (e) { console.error(e); }
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    setFormData({
      title: '', description: '', priority: 'medium', dueDate: '',
      assignedTo: [], recurring: { enabled: false, frequency: 'weekly' }
    });
    setNewSubtask('');
    setNewComment('');
    setShowModal(true);
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedTo: task.assignedTo.map(u => u._id) || [],
      recurring: task.recurring || { enabled: false, frequency: 'weekly' }
    });
    setNewSubtask('');
    setNewComment('');
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) {
      toast.warn('Please enter a task title');
      return;
    }

    try {
      const payload = {
        ...formData,
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo // Axios sends this as an array correctly
      };

      if (selectedTask) {
        // Update
        const res = await axios.put(`${API}/api/tasks/${selectedTask._id}`, payload);
        setTasks(prev => prev.map(t => t._id === selectedTask._id ? res.data : t));
        toast.success('Task updated');
        setShowModal(false);
      } else {
        // Create
        const res = await axios.post(`${API}/api/tasks`, { ...payload, status: 'todo' });
        setTasks(prev => [...prev, res.data]);
        toast.success('Task created');
        setShowModal(false);
      }
    } catch (err) {
      console.error('Task save error:', err.response?.data || err.message);
      toast.error(err.response?.data || 'Failed to save task');
    }
  };

  const addSubtask = async () => {
    if (!selectedTask || !newSubtask.trim()) return;
    try {
      const { data } = await axios.post(`${API}/api/tasks/${selectedTask._id}/subtasks`, { title: newSubtask });
      // Update local state
      const updatedTask = { ...selectedTask, subtasks: data };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? updatedTask : t));
      setNewSubtask('');
    } catch (e) { toast.error('Failed to add subtask'); }
  };

  const toggleSubtask = async (subId) => {
    try {
      const { data } = await axios.put(`${API}/api/tasks/${selectedTask._id}/subtasks/${subId}`);
      const updatedTask = { ...selectedTask, subtasks: data };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? updatedTask : t));
    } catch (e) { toast.error('Failed to update subtask'); }
  };

  const deleteSubtask = async (subId) => {
    try {
      const { data } = await axios.delete(`${API}/api/tasks/${selectedTask._id}/subtasks/${subId}`);
      const updatedTask = { ...selectedTask, subtasks: data };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? updatedTask : t));
    } catch (e) { toast.error('Failed to delete subtask'); }
  };

  const addComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      const { data } = await axios.post(`${API}/api/tasks/${selectedTask._id}/comments`, { content: newComment });
      // We need to re-fetch or simulate the author population. The API returns the comments array populated.
      // Ideally API returns full task or populated comments. My API returns populated comments.
      const updatedComments = data;
      const updatedTask = { ...selectedTask, comments: updatedComments };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? updatedTask : t));
      setNewComment('');
    } catch (e) { toast.error('Failed to add comment'); }
  };

  const updateTaskStatus = async (id, newStatus) => {
    const task = tasks.find(t => t._id === id);
    if (task.status === newStatus) return;

    const orig = [...tasks];
    setTasks(tasks.map(t => t._id === id ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`${API}/api/tasks/${id}`, { status: newStatus });
    } catch (err) {
      setTasks(orig);
      toast.error('Failed to update status');
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    const orig = [...tasks];
    setTasks(tasks.filter(t => t._id !== id));
    try {
      await axios.delete(`${API}/api/tasks/${id}`);
      toast.success('Task deleted');
      if (selectedTask?._id === id) setShowModal(false);
    } catch (err) {
      setTasks(orig);
      toast.error('Failed to delete task');
    }
  };

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    updateTaskStatus(draggableId, destination.droppableId);
  };

  // Filter Logic
  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchPriority;
  });

  const todoTasks = filtered.filter(t => t.status === 'todo' || !t.status);
  const inProgressTasks = filtered.filter(t => t.status === 'in-progress');
  const doneTasks = filtered.filter(t => t.status === 'done');

  const isOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  const TaskCard = ({ task, index }) => {
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const overdue = isOverdue(task);
    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;

    return (
      <Draggable draggableId={task._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`task-card status-${task.status || 'todo'} ${snapshot.isDragging ? 'dragging' : ''} ${overdue ? 'overdue' : ''}`}
            onClick={() => openDetailModal(task)}
            style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.85 : 1 }}
          >
            <div className="task-header">
              <span className="task-title" title={task.title}>{task.title}</span>
              {task.recurring?.enabled && <AiOutlineSync title={`Recurring: ${task.recurring.frequency}`} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
            </div>

            {task.description && (
              <p style={{ margin: '0.3rem 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {task.description}
              </p>
            )}

            {/* Subtask progress bar if needed */}
            {totalSubtasks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <AiOutlineCheckSquare color={completedSubtasks === totalSubtasks ? '#10b981' : 'var(--text-muted)'} />
                <span>{completedSubtasks}/{totalSubtasks}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%`, height: '100%', background: completedSubtasks === totalSubtasks ? '#10b981' : 'var(--primary)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            <div className="task-meta">
              <span style={{ background: pc.bg, color: pc.color, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, borderRadius: 5 }}>
                {pc.dot} {pc.label}
              </span>
              {task.dueDate && (
                <span
                  className="meta-item"
                  style={{ color: overdue ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); navigate('/calendar'); }}
                  title="View in Calendar"
                >
                  <AiOutlineCalendar /> {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {/* Assignees Avatars */}
              <div style={{ display: 'flex', paddingLeft: 6 }}>
                {task.assignedTo && task.assignedTo.length > 0 ? (
                  task.assignedTo.slice(0, 3).map((u, i) => (
                    <div key={u._id} style={{ marginLeft: -6, border: '2px solid var(--sidebar-bg)', borderRadius: '50%' }}>
                      <UserAvatar user={u} size={24} showStatus={false} />
                    </div>
                  ))
                ) : (
                  <div style={{ marginLeft: -6, border: '2px solid var(--sidebar-bg)', borderRadius: '50%' }}>
                    <UserAvatar user={task.user} size={24} showStatus={false} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)' }}>
                {task.comments?.length > 0 && <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 3 }}><AiOutlineComment /> {task.comments.length}</span>}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const modalInputStyle = { width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', color: 'var(--text-primary)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="tasks-container">
      <div className="tasks-header">
        <div>
          <h2 className="tasks-title">Task Board</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tasks.length} tasks · {doneTasks.length} done</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', borderRadius: 10, padding: '0.4rem 0.75rem' }}>
            <AiOutlineSearch color="var(--text-muted)" />
            <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.88rem', width: 140, fontFamily: 'inherit' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><AiOutlineClose size={13} /></button>}
          </div>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...modalInputStyle, width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <button className="btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', borderRadius: 10 }}>
            <AiOutlinePlus /> Add Task
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-grid">
          {[
            { id: 'todo', label: 'To Do', items: todoTasks, cls: 'todo' },
            { id: 'in-progress', label: 'In Progress', items: inProgressTasks, cls: 'in-progress' },
            { id: 'done', label: 'Completed', items: doneTasks, cls: 'done' },
          ].map(col => (
            <div key={col.id} className="kanban-col-wrapper">
              <div className={`col-header ${col.cls}`}><span>{col.label}</span><span className="task-count">{col.items.length}</span></div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}>
                    {loading ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>Loading...</p> : col.items.map((task, index) => <TaskCard key={task._id} task={task} index={index} />)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* ─── Detail / Create Modal ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.form
              onSubmit={handleSaveTask}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ width: 700, maxHeight: '90vh', overflowY: 'auto', background: 'var(--sidebar-bg)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}
              className="task-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task Title"
                    style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                  />
                  <div style={{ marginTop: 5, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    in list <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedTask?.status.replace('-', ' ') || 'To Do'}</span>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><AiOutlineClose size={22} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', flex: 1 }}>
                {/* Main Content */}
                <div style={{ padding: '1.5rem', borderRight: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Values</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add a more detailed description..."
                      rows={4}
                      style={{ ...modalInputStyle, resize: 'vertical', minHeight: 80 }}
                    />
                  </div>

                  {/* Subtasks */}
                  {selectedTask && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AiOutlineCheckSquare /> Subtasks
                      </label>
                      <div style={{ background: 'var(--input-bg)', borderRadius: 8, overflow: 'hidden' }}>
                        {selectedTask.subtasks?.map(sub => (
                          <div key={sub._id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input type="checkbox" checked={sub.completed} onChange={() => toggleSubtask(sub._id)} style={{ cursor: 'pointer' }} />
                            <span style={{ flex: 1, textDecoration: sub.completed ? 'line-through' : 'none', color: sub.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{sub.title}</span>
                            <button onClick={() => deleteSubtask(sub._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><AiOutlineClose /></button>
                          </div>
                        ))}
                        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <AiOutlinePlus color="var(--text-muted)" />
                          <input
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSubtask()}
                            placeholder="Add an item"
                            style={{ background: 'transparent', border: 'none', flex: 1, color: 'var(--text-primary)', outline: 'none' }}
                          />
                          <button onClick={addSubtask} style={{ background: 'var(--primary)', border: 'none', borderRadius: 4, color: 'white', padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Add</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {selectedTask && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AiOutlineComment /> Comments
                      </label>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                        <UserAvatar user={user} size={32} showStatus={false} />
                        <div style={{ flex: 1 }}>
                          <input
                            value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()}
                            placeholder="Write a comment..."
                            style={{ ...modalInputStyle, padding: '0.5rem 0.8rem', borderRadius: 20 }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedTask.comments?.map(c => (
                          <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                            <UserAvatar user={c.author} size={32} showStatus={false} />
                            <div>
                              <div style={{ fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 700, marginRight: 6 }}>{c.author.username}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Fields */}
                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)' }}>
                  {/* Status/Priority/Due */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Priority</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {['low', 'medium', 'high'].map(p => (
                        <button key={p}
                          onClick={() => setFormData({ ...formData, priority: p })}
                          style={{ flex: 1, padding: '4px', fontSize: '0.8rem', background: formData.priority === p ? PRIORITY_CONFIG[p].bg : 'var(--input-bg)', color: formData.priority === p ? PRIORITY_CONFIG[p].color : 'var(--text-muted)', border: `1px solid ${formData.priority === p ? PRIORITY_CONFIG[p].color : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer' }}
                        >
                          {PRIORITY_CONFIG[p].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} style={{ ...modalInputStyle, padding: '0.4rem' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Assignees</label>
                    <div style={{ border: '1px solid var(--border)', background: 'var(--input-bg)', borderRadius: 8, padding: 8, maxHeight: 120, overflowY: 'auto' }}>
                      {users.map(u => (
                        <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px', cursor: 'pointer' }} onClick={() => {
                          const exists = formData.assignedTo.includes(u._id);
                          setFormData({ ...formData, assignedTo: exists ? formData.assignedTo.filter(id => id !== u._id) : [...formData.assignedTo, u._id] });
                        }}>
                          <input type="checkbox" checked={formData.assignedTo.includes(u._id)} readOnly style={{ cursor: 'pointer' }} />
                          <UserAvatar user={u} size={20} showStatus={false} />
                          <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Recurring</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <input type="checkbox" checked={formData.recurring?.enabled} onChange={e => setFormData({ ...formData, recurring: { ...formData.recurring, enabled: e.target.checked } })} style={{ cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.85rem' }}>Enable</span>
                    </div>
                    {formData.recurring?.enabled && (
                      <select value={formData.recurring.frequency} onChange={e => setFormData({ ...formData, recurring: { ...formData.recurring, frequency: e.target.value } })} style={{ ...modalInputStyle, padding: '0.4rem', fontSize: '0.8rem' }}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    )}
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.8rem', borderRadius: 8, marginBottom: 8 }}>
                      {selectedTask ? 'Save Changes' : 'Create Task'}
                    </button>
                    {selectedTask && (
                      <button type="button" onClick={() => deleteTask(selectedTask._id)} style={{ width: '100%', padding: '0.8rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                        Delete Task
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      <AiAssistant
        tasks={tasks}
        user={user}
        onAddTask={(title) => {
          axios.post(`${API}/api/tasks`, { title, status: 'todo', priority: 'medium' })
            .then(res => setTasks(prev => [...prev, res.data]))
            .catch(err => console.error("AI Create Task Error:", err));
        }}
      />
    </motion.div>
  );
};

export default Tasks;
