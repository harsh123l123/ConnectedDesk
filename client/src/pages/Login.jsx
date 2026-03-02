import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Auth.css'; // We'll create this later

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(typeof res.error === 'string' ? res.error : res.error.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <h2>Welcome Back</h2>
        <p>Login to Connected Desk</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Forgot password?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Login</button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
