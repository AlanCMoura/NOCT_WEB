import axios from 'axios';

// Ambiente de dev/local (localhost/127.*): usa proxy do CRA (/ctapi) para evitar CORS.
// Produção ou outros hosts: usa URL real ou REACT_APP_API_URL se fornecida.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.'));

const DEV_PROXY_PREFIX = '/ctapi';
const PROD_API_URL = 'https://api.ct-view.com';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || (isLocalhost ? DEV_PROXY_PREFIX : PROD_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization header from localStorage token for standard requests
api.interceptors.request.use((config) => {
  const url = config.url || '';
  // Only skip adding the stored token for unauthenticated entrypoints (login/verify).
  const skipAuthPaths = ['/auth/login', '/auth/verify'];
  const skipAuth = skipAuthPaths.some((path) => url.includes(path));

  const token = localStorage.getItem('authToken');
  if (token && !skipAuth) {
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

