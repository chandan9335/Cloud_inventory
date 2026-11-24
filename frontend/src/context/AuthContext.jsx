import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('retail_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('retail_token') || '');

  useEffect(() => {
    api.get('/auth/me').catch(() => {}); // validate token silently
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('retail_token', data.token);
    localStorage.setItem('retail_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveSession(data);
  };

  const logout = () => {
    localStorage.removeItem('retail_token');
    localStorage.removeItem('retail_user');
    setToken('');
    setUser(null);
  };

  const can = (...roles) => user && roles.some((r) => user.role === r);

  return <AuthContext.Provider value={{ user, token, login, register, logout, can }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);