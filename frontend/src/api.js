import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    || (import.meta.env.PROD ? 'https://cloud-inventory-3t9v.onrender.com/api' : '/api'),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('retail_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('retail_token')) {
      localStorage.removeItem('retail_token');
      localStorage.removeItem('retail_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;