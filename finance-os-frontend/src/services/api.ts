import axios from 'axios';
import { useAuthStore } from '../app/store';

export const api = axios.create({
  // baseURL: '/api/v1',
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
      try {
        const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
        const { data } = await axios.post(`${base}/auth/refresh`, { refresh_token: refreshToken });
        const { access_token } = data;
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user!,
          access_token,
          data.refresh_token || refreshToken
        );
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
