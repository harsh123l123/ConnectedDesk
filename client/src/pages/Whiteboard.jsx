import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  AiOutlineClear, AiOutlineSave, AiOutlineArrowLeft, AiOutlineUndo,
  AiOutlineRedo
} from 'react-icons/ai';
import {
  MdOutlineDraw, MdOutlineAutoFixNormal, MdOutlineRectangle,
  MdRadioButtonUnchecked, MdOutlineTitle
} from 'react-icons/md';
import { HiOutlineMinus } from 'react-icons/hi';
import { BsArrowUpRight } from 'react-icons/bs';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import '../styles/Whiteboard.css';

const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  RECT: 'rect',
  CIRCLE: 'circle',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
};

const COLORS = [
  '#ffffff', '#6366f1', '#10b981', '#ef4444',
  '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'
];

const Whiteboard = () => {
  const { socket, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const chatId = location.state?.chatId || null;
  const chatName = location.state?.chatName || null;
  const ROOM = chatId ? `whiteboard-${chatId}` : 'global-whiteboard';

  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const [activeTool, setActiveTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);

  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [hIndex, setHIndex] = useState(-1);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  // --- Remote Drawing Handlers ---
  const drawArrow = useCallback((ctx, fromx, fromy, tox, toy, width) => {
    const headlen = 10 * (width / 2);
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.stroke();
  }, []);

  const drawRemoteObject = useCallback((d) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.strokeStyle = d.color;
    ctx.lineWidth = d.width;
    ctx.fillStyle = d.color;

    switch (d.type) {
      case 'line':
      case 'pen':
      case 'eraser':
        ctx.beginPath();
        ctx.moveTo(d.x0, d.y0);
        ctx.lineTo(d.x1, d.y1);
        ctx.stroke();
        break;
      case 'rect':
        ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(d.x1 - d.x0, 2) + Math.pow(d.y1 - d.y0, 2));
        ctx.beginPath();
        ctx.arc(d.x0, d.y0, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'arrow':
        drawArrow(ctx, d.x0, d.y0, d.x1, d.y1, d.width);
        break;
      case 'text':
        ctx.font = `${d.width * 5}px Outfit`;
        ctx.fillText(d.text, d.x, d.y);
        break;
      default:
        break;
    }
  }, [drawArrow]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL();

    setHistory(prev => {
      const newHistory = prev.slice(0, hIndex + 1);
      newHistory.push(data);
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
    setHIndex(prev => {
      // If we shifted the array, the index might stay the same or increase
      const newIdx = Math.min(prev + 1, 19);
      return newIdx;
    });
  }, [hIndex]);

  // --- Initialization & Socket Listeners ---
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth - 72;
    canvas.height = window.innerHeight;

    // willReadFrequently optimization for getImageData
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    const onDrawEvent = (data) => drawRemoteObject(data);
    const onClearEvent = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Empty history on remote clear too
      setHistory([]);
      setHIndex(-1);
    };
    const onHistoryEvent = (historyData) => {
      if (historyData && historyData.length > 0) {
        historyData.forEach(action => drawRemoteObject(action));
      }
    };

    if (socket) {
      socket.on('draw-line', onDrawEvent);
      socket.on('clear-board', onClearEvent);
      socket.on('whiteboard-history', onHistoryEvent);
      socket.emit('join-whiteboard', ROOM);
    }

    // Initial history state
    const initialData = canvas.toDataURL();
    setHistory([initialData]);
    setHIndex(0);

    return () => {
      if (socket) {
        socket.off('draw-line', onDrawEvent);
        socket.off('clear-board', onClearEvent);
        socket.off('whiteboard-history', onHistoryEvent);
      }
    };
  }, [socket, ROOM, drawRemoteObject]);

  const undo = () => {
    if (hIndex > 0) {
      const newIndex = hIndex - 1;
      setHIndex(newIndex);
      loadHistoryImage(history[newIndex]);
    }
  };

  const redo = () => {
    if (hIndex < history.length - 1) {
      const newIndex = hIndex + 1;
      setHIndex(newIndex);
      loadHistoryImage(history[newIndex]);
    }
  };

  const loadHistoryImage = (data) => {
    const img = new Image();
    img.src = data;
    img.onload = () => {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      contextRef.current.drawImage(img, 0, 0);
    };
  };

  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const pos = getPointerPos(e);
    setStartPos(pos);
    setIsDrawing(true);

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.ERASER) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === TOOLS.TEXT) {
      const text = window.prompt("Enter text:");
      if (text) {
        ctx.font = `${lineWidth * 5}px Outfit`;
        ctx.fillStyle = color;
        ctx.fillText(text, pos.x, pos.y);
        if (socket) socket.emit('draw-line', { type: 'text', text, x: pos.x, y: pos.y, color, width: lineWidth, room: ROOM });
        saveToHistory();
      }
      setIsDrawing(false);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    const ctx = contextRef.current;

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.ERASER) {
      const strokeColor = activeTool === TOOLS.ERASER ? '#1e293b' : color;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = activeTool === TOOLS.ERASER ? lineWidth * 5 : lineWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (socket) {
        socket.emit('draw-line', {
          type: 'line', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y,
          color: strokeColor, width: ctx.lineWidth, room: ROOM
        });
      }
      setStartPos(pos);
    } else {
      if (snapshot) {
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        if (activeTool === TOOLS.RECT) {
          ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        } else if (activeTool === TOOLS.CIRCLE) {
          const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
          ctx.beginPath();
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (activeTool === TOOLS.LINE) {
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (activeTool === TOOLS.ARROW) {
          drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y, lineWidth);
        }
      }
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    const ctx = contextRef.current;

    if (activeTool !== TOOLS.PEN && activeTool !== TOOLS.ERASER && activeTool !== TOOLS.TEXT) {
      if (socket) {
        socket.emit('draw-line', {
          type: activeTool, x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y,
          color, width: lineWidth, room: ROOM
        });
      }
    }

    ctx.closePath();
    setIsDrawing(false);
    saveToHistory();
  };

  const clearBoard = () => {
    if (window.confirm("Clear the entire board?")) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (socket) socket.emit('clear-board', { room: ROOM });
      setHistory([]);
      setHIndex(-1);
      saveToHistory();
    }
  };

  const saveBoard = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${chatName || 'connected'}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast.success("Board saved as PNG");
  };

  return (
    <div className="whiteboard-container">
      <aside className="whiteboard-sidebar">
        <div className="whiteboard-logo"><MdOutlineDraw /></div>
        <button className={`tool-btn ${activeTool === TOOLS.PEN ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.PEN)}>
          <MdOutlineDraw size={22} /><span className="tool-tooltip">Pen</span>
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.ERASER ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.ERASER)}>
          <MdOutlineAutoFixNormal size={22} /><span className="tool-tooltip">Eraser</span>
        </button>
        <div className="tool-sep" />
        <button className={`tool-btn ${activeTool === TOOLS.RECT ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.RECT)}>
          <MdOutlineRectangle size={22} /><span className="tool-tooltip">Rectangle</span>
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.CIRCLE ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.CIRCLE)}>
          <MdRadioButtonUnchecked size={22} /><span className="tool-tooltip">Circle</span>
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.LINE ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.LINE)}>
          <HiOutlineMinus size={22} /><span className="tool-tooltip">Line</span>
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.ARROW ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.ARROW)}>
          <BsArrowUpRight size={20} /><span className="tool-tooltip">Arrow</span>
        </button>
        <div className="tool-sep" />
        <button className={`tool-btn ${activeTool === TOOLS.TEXT ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.TEXT)}>
          <MdOutlineTitle size={22} /><span className="tool-tooltip">Text</span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="tool-btn" onClick={() => navigate('/chat')}>
          <AiOutlineArrowLeft size={22} /><span className="tool-tooltip">Back</span>
        </button>
      </aside>

      <main className="canvas-wrapper">
        <header className="whiteboard-topbar">
          <div className="topbar-info">
            <span className="chat-name-tag">{chatName || 'Sandbox'}</span>
            <span style={{ color: '#6366f1' }}>&bull;</span>
            <span>Collaboration ON</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div className="tool-group">
            <button className="tool-btn" onClick={undo} disabled={hIndex <= 0}><AiOutlineUndo size={20} /></button>
            <button className="tool-btn" onClick={redo} disabled={hIndex >= history.length - 1}><AiOutlineRedo size={20} /></button>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div className="tool-group">
            <button className="tool-btn" onClick={clearBoard} title="Clear"><AiOutlineClear size={20} /></button>
            <button className="tool-btn" onClick={saveBoard} title="Save"><AiOutlineSave size={20} /></button>
          </div>
        </header>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className="whiteboard-canvas"
          style={{ cursor: activeTool === TOOLS.ERASER ? 'cell' : 'crosshair' }}
        />

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="properties-panel">
          <div className="prop-group">
            <span className="prop-label">Colors</span>
            <div className="color-grid">
              {COLORS.map(c => (
                <div key={c} className={`color-option ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <div className="prop-group">
            <span className="prop-label">Stroke Width: {lineWidth}px</span>
            <input type="range" min="1" max="20" value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} className="size-slider" />
          </div>
        </motion.div>

        <div className="bottom-controls">
          <div className="control-pill"><span style={{ color: '#94a3b8' }}>Tool:</span><span style={{ fontWeight: 600 }}>{activeTool.toUpperCase()}</span></div>
          <div className="control-pill"><span style={{ color: '#94a3b8' }}>User:</span><span style={{ fontWeight: 600 }}>{user.username}</span></div>
        </div>
      </main>
    </div>
  );
};

export default Whiteboard;
