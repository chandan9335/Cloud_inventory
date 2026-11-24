import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@retail.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || (isSignup ? 'Account creation failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup((current) => !current);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <div className="login-wrap">
      <div className="login-glow login-glow-left" />
      <div className="login-glow login-glow-right" />

      <form className="card login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-logo login-brand-logo">📦</div>
          <div>
            <div className="login-kicker">Smart inventory</div>
            <h2>{isSignup ? 'Create account' : 'StockPilot'}</h2>
          </div>
        </div>

        <p className="sub">Cloud-based Inventory & Demand Forecasting for Retail Chains</p>
        {error && <div className="login-error">{error}</div>}

        {isSignup && (
          <div className="field">
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary login-btn" disabled={loading}>
          {loading ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Create account' : 'Sign in')}
        </button>
        <p className="login-switch-wrap">
          {isSignup ? 'Already have an account?' : 'New to StockPilot?'}{' '}
          <button type="button" className="login-switch" onClick={toggleMode}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </form>
    </div>
  );
}