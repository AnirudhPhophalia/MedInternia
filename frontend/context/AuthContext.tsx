import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userId: string, user: any) => void;
  logout: () => void;
  refreshUser: () => void;
}

let _globalToken: string | null = null;

export const setGlobalToken = (t: string | null) => { _globalToken = t; };
export const getGlobalToken = () => _globalToken;

const AuthContext = createContext<AuthContextType>({
  token: null,
  userId: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    api.get('/auth/validate-token')
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('userId', id);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((newToken: string, newUserId: string, newUser: any) => {
    setToken(newToken);
    setGlobalToken(newToken);
    setUserId(newUserId);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('userId', newUserId);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setGlobalToken(null);
    setUserId(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    api.get('/auth/validate-token')
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('userId', id);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        user,
        isAuthenticated: !!token || !!userId,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
