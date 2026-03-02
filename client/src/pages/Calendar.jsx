import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  AiOutlineLeft, AiOutlineRight, AiOutlinePlus,
  AiOutlineClockCircle, AiOutlineClose, AiOutlineCalendar
} from 'react-icons/ai';
import { motion } from 'framer-motion';
import { API } from '../api';
import '../styles/Calendar.css';

// ─── Helpers ───
const isSameDay = (d1, d2) =>
  d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

const isToday = (date) => isSameDay(date, new Date());

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day; // Adjust to Sunday
  return new Date(d.setDate(diff));
};

// ─── Sub-Components ───

const MonthView = ({ currentDate, events, setSelectedDate, setShowModal, onEventClick }) => {
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const dayCells = [];

  // Prev Month
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    dayCells.push({ day: prevMonthDays - i, type: 'prev', date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // Current
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push({ day: i, type: 'current', date: new Date(year, month, i) });
  }
  // Next
  const remaining = 42 - dayCells.length;
  for (let i = 1; i <= remaining; i++) {
    dayCells.push({ day: i, type: 'next', date: new Date(year, month + 1, i) });
  }

  return (
    <motion.div className="calendar-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="day-name">{d}</div>)}
      {dayCells.map((cell, idx) => {
        const cellEvents = events.filter(e => isSameDay(e.date, cell.date));
        return (
          <div key={idx} className={`calendar-day ${cell.type !== 'current' ? 'other-month' : ''} ${isToday(cell.date) ? 'today' : ''}`}
            onClick={() => { if (cell.type === 'current') { setSelectedDate(cell.date); setShowModal(true); } }}>
            <div className="day-number">{cell.day}</div>
            <div className="events-list">
              {cellEvents.map((evt, i) => (
                <div key={i} className={`event-item event-${evt.type}`} title={evt.title} onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}>
                  {evt.type === 'meeting' && <AiOutlineClockCircle style={{ marginRight: 4, fontSize: '0.7rem' }} />}
                  {evt.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

const TimeGridView = ({ mode, currentDate, events, setSelectedDate, setShowModal, setNewMeeting, onEventClick }) => {
  const daysToShow = mode === 'day' ? [currentDate] : Array.from({ length: 7 }, (_, i) => {
    const d = getWeekStart(currentDate);
    d.setDate(d.getDate() + i);
    return new Date(d);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="time-view-container">
      {/* Header */}
      <div className="time-view-header">
        <div className="time-gutter-header"></div>
        <div className="days-header">
          {daysToShow.map((d, i) => (
            <div key={i} className={`day-col-header ${isToday(d) ? 'today' : ''}`}>
              <span className="day-name-small">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <div className="day-num-big">{d.getDate()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* All Day Section */}
      <div className="all-day-section">
        <div className="all-day-label">All Day</div>
        <div className="all-day-grid">
          {daysToShow.map((d, i) => {
            const allDayEvents = events.filter(e => e.allDay && isSameDay(e.date, d));
            return (
              <div key={i} className="all-day-col">
                {allDayEvents.map((evt, idx) => (
                  <div key={idx} className="all-day-event" onClick={() => onEventClick(evt)}>
                    {evt.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Body */}
      <div className="time-view-body">
        <div className="time-gutter">
          {hours.map(h => (
            <div key={h} className="time-slot-label">
              {h === 0 ? '' : `${h}:00`}
            </div>
          ))}
        </div>

        <div className="days-grid">
          <div className="hour-lines">
            {hours.map(h => <div key={h} className="hour-line" />)}
          </div>

          {daysToShow.map((d, colIdx) => {
            const dayMeetings = events.filter(e => !e.allDay && isSameDay(e.date, d));
            return (
              <div key={colIdx} className="day-col" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + e.currentTarget.scrollTop;
                const hour = Math.floor(y / 60);
                const newD = new Date(d);
                newD.setHours(hour, 0);
                setSelectedDate(newD);
                setNewMeeting(prev => ({ ...prev, time: `${hour.toString().padStart(2, '0')}:00` }));
                setShowModal(true);
              }}>
                {dayMeetings.map(mtg => {
                  const h = mtg.date.getHours();
                  const m = mtg.date.getMinutes();
                  const top = (h * 60) + m;
                  const height = 60;
                  return (
                    <div key={mtg.id} className="event-block event-meeting"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(mtg); }}
                    >
                      <div style={{ fontWeight: 600 }}>{mtg.title}</div>
                      <div style={{ fontSize: '0.7rem' }}>{h}:{m.toString().padStart(2, '0')} - {mtg.venue}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const navigateRouter = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Form State
  const [eventType, setEventType] = useState('meeting'); // 'meeting' or 'task'
  const [newMeeting, setNewMeeting] = useState({
    title: '', description: '', time: '10:00', venue: 'Google Meet', attendees: []
  });
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium'
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const [tasksRes, meetingsRes] = await Promise.all([
        axios.get(`${API}/api/tasks`),
        axios.get(`${API}/api/meetings`)
      ]);

      const formattedTasks = tasksRes.data.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        date: new Date(task.dueDate || task.createdAt),
        type: 'task',
        priority: task.priority,
        status: task.status,
        allDay: true,
        originalData: task
      }));

      const formattedMeetings = meetingsRes.data.map(meeting => ({
        id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        date: new Date(meeting.dateTime),
        type: 'meeting',
        venue: meeting.venue,
        organizer: meeting.organizer,
        allDay: false,
        originalData: meeting
      }));

      setEvents([...formattedTasks, ...formattedMeetings]);
    } catch (err) {
      console.error("Error fetching calendar events", err);
      toast.error('Failed to load some calendar events');
    }
    setLoading(false);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (eventType === 'meeting') {
      if (!newMeeting.title || !selectedDate) return;
      const [hours, minutes] = newMeeting.time.split(':');
      const dateTime = new Date(selectedDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes));

      try {
        await axios.post(`${API}/api/meetings`, {
          title: newMeeting.title,
          description: newMeeting.description,
          dateTime: dateTime,
          venue: newMeeting.venue,
          attendees: []
        });
        fetchEvents();
        setShowFormModal(false);
        setNewMeeting({ title: '', description: '', time: '10:00', venue: 'Google Meet', attendees: [] });
        toast.success('Meeting scheduled');
      } catch (err) { toast.error('Failed to schedule meeting'); }
    } else {
      if (!newTask.title || !selectedDate) return;
      try {
        await axios.post(`${API}/api/tasks`, {
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          dueDate: selectedDate,
          status: 'todo'
        });
        fetchEvents();
        setShowFormModal(false);
        setNewTask({ title: '', description: '', priority: 'medium' });
        toast.success('Task created');
      } catch (err) { toast.error('Failed to create task'); }
    }
  };

  const deleteMeeting = async (id) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await axios.delete(`${API}/api/meetings/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
      setShowDetailModal(false);
      toast.success('Meeting cancelled');
    } catch (err) { toast.error('Failed to cancel meeting'); }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleDateChange = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (view === 'day') {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getHeaderText = () => {
    const options = { year: 'numeric', month: 'long' };
    if (view === 'day') return currentDate.toLocaleDateString('en-US', { ...options, day: 'numeric' });
    if (view === 'week') {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) return start.toLocaleDateString('en-US', options);
      return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2 className="calendar-title">Calendar</h2>

        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => handleDateChange(-1)}><AiOutlineLeft /></button>
          <span className="current-month">{getHeaderText()}</span>
          <button className="nav-btn" onClick={() => handleDateChange(1)}><AiOutlineRight /></button>
        </div>

        <div className="view-switcher">
          {['month', 'week', 'day'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`view-btn ${view === v ? 'active' : ''}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={() => { setSelectedDate(new Date()); setShowFormModal(true); }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AiOutlinePlus /> New Event
        </button>
      </div>

      {view === 'month' ?
        <MonthView currentDate={currentDate} events={events} setSelectedDate={(d) => { setSelectedDate(d); setShowFormModal(true); }} setShowModal={setShowFormModal} onEventClick={handleEventClick} /> :
        <TimeGridView mode={view} currentDate={currentDate} events={events} setSelectedDate={(d) => { setSelectedDate(d); setShowFormModal(true); }} setShowModal={setShowFormModal} setNewMeeting={setNewMeeting} onEventClick={handleEventClick} />
      }

      {/* Schedule Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFormModal(false) }}>
          <div className="modal-content">
            <h3 style={{ marginTop: 0, color: 'white' }}>Create New Event</h3>
            <div className="event-type-tabs" style={{ display: 'flex', gap: 10, marginBottom: 20, background: 'var(--input-bg)', padding: 4, borderRadius: 10 }}>
              <button onClick={() => setEventType('meeting')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: eventType === 'meeting' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Meeting</button>
              <button onClick={() => setEventType('task')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: eventType === 'task' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Task</button>
            </div>

            <p style={{ marginTop: -10, marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedDate?.toDateString()} {eventType === 'meeting' ? newMeeting.time : ''}</p>

            <form onSubmit={createEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {eventType === 'meeting' ? (
                <>
                  <div>
                    <label className="modal-label">Meeting Title</label>
                    <input placeholder="Project Sync" value={newMeeting.title} onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="modal-label">Start Time</label>
                      <input type="time" value={newMeeting.time} onChange={e => setNewMeeting({ ...newMeeting, time: e.target.value })} />
                    </div>
                    <div>
                      <label className="modal-label">Venue / Link</label>
                      <input placeholder="Google Meet" value={newMeeting.venue} onChange={e => setNewMeeting({ ...newMeeting, venue: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="modal-label">Description</label>
                    <textarea placeholder="Discuss weekly progress..." value={newMeeting.description} onChange={e => setNewMeeting({ ...newMeeting, description: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="modal-label">Task Title</label>
                    <input placeholder="Finish Documentation" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                  </div>
                  <div>
                    <label className="modal-label">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="modal-label">Description</label>
                    <textarea placeholder="Detailed tasks..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{eventType === 'meeting' ? 'Schedule' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showDetailModal && selectedEvent && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false) }}>
          <div className="modal-content" style={{ borderLeft: `6px solid ${selectedEvent.type === 'meeting' ? '#f43f5e' : '#10b981'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: selectedEvent.type === 'meeting' ? '#f43f5e' : '#10b981' }}>{selectedEvent.type}</span>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><AiOutlineClose size={20} /></button>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>{selectedEvent.title}</h3>
            <div style={{ display: 'flex', gap: 10, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><AiOutlineCalendar /> {selectedEvent.date.toDateString()}</span>
              {!selectedEvent.allDay && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><AiOutlineClockCircle /> {selectedEvent.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>

            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>{selectedEvent.description || "No description provided."}</p>

            {selectedEvent.type === 'meeting' && (
              <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: 10, marginBottom: '2rem' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Venue / Link</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedEvent.venue}</p>
                <p style={{ margin: '15px 0 4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organizer</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedEvent.organizer?.username || 'Team'}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              {selectedEvent.type === 'meeting' && selectedEvent.organizer?._id === user._id && (
                <button onClick={() => deleteMeeting(selectedEvent.id)} className="btn-delete" style={{ flex: 1, padding: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel Meeting</button>
              )}
              {selectedEvent.type === 'task' && (
                <button onClick={() => navigateRouter('/tasks')} className="btn-primary" style={{ flex: 1 }}>Go to Task Board</button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary" style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
