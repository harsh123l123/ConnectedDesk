import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineMail, AiOutlineArrowLeft, AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { toast } from 'react-toastify';
import { API } from '../api';
import '../styles/Auth.css';

/* ── Step indicator ── */
const StepDot = ({ step, current }) => (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: current >= step ? 'var(--primary)' : 'var(--surface-light)',
    border: `2px solid ${current >= step ? 'var(--primary)' : 'var(--border)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.8rem', fontWeight: 700,
    color: current >= step ? 'white' : 'var(--text-muted)',
    transition: 'all 0.3s ease',
    flexShrink: 0
  }}>{step}</div>
);

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1=email, 2=token+new pass, 3=success
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState(''); // shown to user
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Step 1 — request token */
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/forgot-password`, { email });
      setGeneratedToken(data.token);
      setUsername(data.username);
      setStep(2);
      toast.success(`Token generated for ${data.username}!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  /* Step 2 — reset password */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/reset-password`, {
        token, newPassword
      });
      setStep(3);
      toast.success(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '0.85rem 1rem',
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div className="auth-container">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card glass-panel"
        style={{ maxWidth: 440 }}
      >
        {/* Back to login */}
        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem'
        }}>
          <AiOutlineArrowLeft /> Back to Login
        </Link>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2rem' }}>
          <StepDot step={1} current={step} />
          <div style={{ flex: 1, height: 2, background: step >= 2 ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s' }} />
          <StepDot step={2} current={step} />
          <div style={{ flex: 1, height: 2, background: step >= 3 ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s' }} />
          <StepDot step={3} current={step} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Enter Email ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Forgot Password?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.8rem', fontSize: '0.9rem' }}>
                Enter your registered email address and we'll generate a reset token for you.
              </p>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleRequestToken} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <AiOutlineMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Checking...' : 'Get Reset Token →'}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Enter Token + New Password ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Reset Password
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Hi <strong style={{ color: 'var(--primary)' }}>{username}</strong>! Your reset token is below. Copy it and enter it to reset your password.
              </p>

              {/* Token display box */}
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px dashed var(--primary)',
                borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Reset Token</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {generatedToken}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ Valid for 1 hour</p>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter the 6-digit token above"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                  maxLength={6}
                  style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem', fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                />

                <div style={{ position: 'relative' }}>
                  <AiOutlineLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0
                  }}>
                    {showPass ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <AiOutlineLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 4,
                        background: newPassword.length >= i * 3
                          ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#6366f1' : '#10b981'
                          : 'var(--border)',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '1rem 0' }}>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                style={{ fontSize: '4rem', marginBottom: '1rem' }}
              >
                🎉
              </motion.div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Password Reset!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Your password has been successfully updated. You can now log in with your new password.
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '0.9rem 2rem', textDecoration: 'none' }}>
                Go to Login →
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
