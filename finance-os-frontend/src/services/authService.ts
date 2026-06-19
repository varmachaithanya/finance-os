import { api } from './api';
import type { User } from '../app/store';
import { useStore } from '../app/store';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  currency?: string;
  timezone?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export const login = async (email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  const tokenRes = await api.post<TokenResponse>('/auth/login', { email, password });
  const { access_token, refresh_token } = tokenRes.data;
  const meRes = await api.get<User>('/auth/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return { user: meRes.data, accessToken: access_token, refreshToken: refresh_token };
};

export const register = async (data: RegisterRequest): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  const userRes = await api.post<User>('/auth/register', data);
  const tokenRes = await api.post<TokenResponse>('/auth/login', { email: data.email, password: data.password });
  return { user: userRes.data, accessToken: tokenRes.data.access_token, refreshToken: tokenRes.data.refresh_token };
};

export const refresh = async (refreshToken: string): Promise<TokenResponse> => {
  const res = await api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
  return res.data;
};
export const logout = () => api.post('/auth/logout', { refresh_token: useStore.getState().refreshToken }).then(r => r.data);

export const getMe = () => api.get<User>('/auth/me').then(r => r.data);

export const updateMe = (data: UpdateProfileRequest) => api.put<User>('/auth/me', data).then(r => r.data);

export const changePassword = (data: ChangePasswordRequest) => api.post('/auth/change-password', data).then(r => r.data);

export const forgotPassword = (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }).then(r => r.data);

export const resetPassword = (data: { token: string; new_password: string }) => api.post('/auth/reset-password', data).then(r => r.data);

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const deleteAvatar = () => api.delete('/auth/me/avatar').then(r => r.data);
