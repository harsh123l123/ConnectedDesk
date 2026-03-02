import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AiOutlineClose, AiOutlinePlayCircle, AiOutlinePauseCircle,
  AiOutlineReload, AiOutlineCoffee, AiOutlineThunderbolt
} from 'react-icons/ai';
import '../styles/FocusMode.css';

const FocusMode = ({ isOpen, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, short, long

  useEffect(() => {
    let timer = null;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timer);
      setIsActive(false);
      // Play sound or notification here
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'focus') setTimeLeft(25 * 60);
    else if (mode === 'short') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    if (newMode === 'focus') setTimeLeft(25 * 60);
    else if (newMode === 'short') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="focus-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="focus-mesh-bg" />

          <button className="focus-close-btn" onClick={onClose}>
            <AiOutlineClose size={24} />
          </button>

          <div className="focus-content">
            <motion.div
              className="focus-timer-container"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="focus-mode-switcher">
                <button
                  className={mode === 'focus' ? 'active' : ''}
                  onClick={() => changeMode('focus')}
                >
                  <AiOutlineThunderbolt /> Deep Work
                </button>
                <button
                  className={mode === 'short' ? 'active' : ''}
                  onClick={() => changeMode('short')}
                >
                  <AiOutlineCoffee /> Short Break
                </button>
              </div>

              <div className="timer-display">
                <span className="timer-numbers">{formatTime(timeLeft)}</span>
                <span className="timer-label">{mode.toUpperCase()}</span>
              </div>

              <div className="focus-controls">
                <button onClick={resetTimer} className="control-btn-secondary">
                  <AiOutlineReload size={24} />
                </button>
                <button onClick={toggleTimer} className="control-btn-main">
                  {isActive ? <AiOutlinePauseCircle size={48} /> : <AiOutlinePlayCircle size={48} />}
                </button>
              </div>
            </motion.div>

            <motion.div
              className="focus-quotes"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p>"Your mind is for having ideas, not holding them."</p>
              <span>— David Allen</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FocusMode;
