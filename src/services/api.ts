import axios from 'axios';

const DEV_PROXY_PREFIX = '/__ctapi';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development' ? DEV_PROXY_PREFIX : 'https://api.ct-view.com');

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization header from localStorage token for standard requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    const headers = config.headers as Record<string, string>;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('authToken', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common.Authorization;
  }
};

export const getBaseUrl = () => API_BASE_URL;

