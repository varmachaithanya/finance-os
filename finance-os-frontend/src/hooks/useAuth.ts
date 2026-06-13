import { useState } from 'react';
import { useStore } from '../app/store';
import { authService } from '../services/authService';
import type { LoginRequest, RegisterRequest } from '../services/authService';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout } = useStore();

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      storeLogin(response.user, response.accessToken, response.refreshToken);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      storeLogin(response.user, response.accessToken, response.refreshToken);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      storeLogout();
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
};
