import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AiOutlineRobot, AiOutlineClose, AiOutlineSend, AiOutlineThunderbolt,
  AiOutlineCheckCircle, AiOutlineInfoCircle
} from 'react-icons/ai';
import '../styles/AiAssistant.css';

const AiAssistant = ({ tasks = [], meetings = [], user = null, onAddTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      type: 'text',
      content: `Welcome back, ${user?.username || 'Executive'}! I've synchronized your workspace. How can I assist you in reaching 100% efficiency today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [mood, setMood] = useState('focused'); // focused, alerting, celebrating

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getWorkspaceStats = () => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const high = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, high, overdue, completionRate };
  };

  const renderMessage = (m) => {
    if (m.type === 'insight') {
      return (
        <div className="ai-insight-card">
          <div className="card-header">
            <AiOutlineThunderbolt /> Workspace Pulse
          </div>
          <div className="card-stats">
            <div className="stat-box"><span>{m.data.done}</span><p>Done</p></div>
            <div className="stat-box"><span>{m.data.high.length}</span><p>High</p></div>
            <div className="stat-box"><span>{m.data.overdue.length}</span><p>Overdue</p></div>
          </div>
          <div className="card-progress">
            <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${m.data.completionRate}%` }} /></div>
            <span>{m.data.completionRate}% Efficiency</span>
          </div>
        </div>
      );
    }

    if (m.type === 'card') {
      return (
        <div className="ai-action-card">
          <h4>{m.data.title}</h4>
          <p>{m.content}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              m.data.onAction();
            }}
            className="card-action-btn"
          >
            {m.data.actionLabel}
          </button>
        </div>
      );
    }

    return m.content;
  };

  const streamResponse = (fullText, type = 'text', data = null) => {
    let index = 0;
    const words = fullText.split(' ');
    let currentContent = "";

    // Create the message placeholder
    const msgId = Date.now();
    setMessages(prev => [...prev, {
      id: msgId,
      role: 'assistant',
      type,
      content: "",
      data,
      isStreaming: true
    }]);

    const interval = setInterval(() => {
      if (index < words.length) {
        currentContent += (index === 0 ? "" : " ") + words[index];
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, content: currentContent } : m
        ));
        index++;
      } else {
        clearInterval(interval);
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, isStreaming: false } : m
        ));
        setIsTyping(false);
      }
    }, 40);
  };

  const handleSend = (overrideInput) => {
    const query = (overrideInput || input).trim();
    if (!query) return;

    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'user', type: 'text', content: query }]);
    setInput('');
    setIsTyping(true);

    const stats = getWorkspaceStats();

    setTimeout(() => {
      let fullText = "";
      let type = 'text';
      let data = null;
      const lower = query.toLowerCase();

      if (lower.startsWith('add task ') || lower.startsWith('create task ')) {
        const title = query.replace(/^(add task |create task )/i, '');
        fullText = `I've analyzed your request and prepared the task: "${title}". I'll place it in your "To-Do" column with medium priority. Shall we proceed with the creation?`;
        type = 'card';
        data = {
          title: 'Direct Action: Create Task',
          actionLabel: 'Add to Board',
          onAction: () => {
            if (onAddTask) onAddTask(title);
            streamResponse(`Success! I've added "${title}" to your board.`);
          }
        };
      }
      else if (lower.includes('status') || lower.includes('summary')) {
        setMood(stats.overdue.length > 0 ? 'alerting' : 'focused');
        type = 'insight';
        fullText = `Based on your recent activity, your workspace efficiency is cruising at ${stats.completionRate}%. Here is your full productivity breakdown:`;
        data = stats;
      }
      else if (lower.includes('priority')) {
        fullText = stats.high.length > 0
          ? `Your absolute focus should be on "${stats.high[0].title}". It's currently your most critical bottleneck.`
          : "You have no high-priority fires to put out. It's a great time to tackle some backlog items.";
      }
      else if (lower.includes('meeting')) {
        if (meetings.length > 0) {
          const next = meetings.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0];
          fullText = `Your next engagement is "${next.title}" scheduled for ${new Date(next.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
        } else {
          fullText = "I don't see any upcoming meetings. You have an open window for some deep work.";
        }
      }
      else {
        fullText = "I'm your Connected Desk intelligence. I can generate productivity insights, manage your Kanban board, or help you navigate your schedule. What would you like to explore?";
      }

      streamResponse(fullText, type, data);
    }, 800);
  };

  return (
    <>
      <button className="ai-trigger-btn" onClick={() => setIsOpen(true)}>
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <AiOutlineRobot size={28} />
        </motion.div>
        <span className="ai-badge">AI</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`ai-sidebar theme-${mood}`}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
          >
            <div className="ai-header">
              <div className="ai-title">
                <div className="pulsing-orbit">
                  <AiOutlineRobot size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem' }}>Executive AI</h3>
                  <p style={{ fontSize: '0.65rem', color: 'var(--success)', margin: 0 }}>● SYSTEMS ONLINE</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                <AiOutlineClose size={20} />
              </button>
            </div>

            <div className="ai-insight-panel">
              <div className="productivity-pulse-bar">
                <div className="pulse-info">
                  <span>Productivity Pulse</span>
                  <span>{getWorkspaceStats().completionRate}%</span>
                </div>
                <div className="pulse-track"><div className="pulse-fill" style={{ width: `${getWorkspaceStats().completionRate}%` }} /></div>
              </div>
            </div>

            <div className="ai-messages">
              {messages.map((m, i) => (
                <div key={i} className={`ai-message-wrapper ${m.role}`}>
                  <div className={`ai-message type-${m.type} ${m.isStreaming ? 'is-streaming' : ''}`}>
                    {renderMessage(m)}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="ai-message-wrapper assistant">
                  <div className="ai-message typing">
                    <div className="dot" /><div className="dot" /><div className="dot" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="ai-input-wrapper-master">
              <div className="ai-quick-actions">
                <button onClick={() => handleSend("Give me a status summary")}>📊 Status</button>
                <button onClick={() => handleSend("What is my top priority?")}>🚩 Priority</button>
                <button onClick={() => handleSend("What's my next meeting?")}>📅 Next Meeting</button>
              </div>
              <div className="ai-input-area">
                <input
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={() => handleSend()} className="send-btn">
                  <AiOutlineSend />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
