import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@retail.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
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
            <h2>StockPilot</h2>
          </div>
        </div>

        <p className="sub">Cloud-based Inventory & Demand Forecasting for Retail Chains</p>
        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button className="btn btn-primary login-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}