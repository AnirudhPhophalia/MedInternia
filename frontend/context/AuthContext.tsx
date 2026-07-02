import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
    try {
      const storedToken = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      const storedUserStr = localStorage.getItem('user');
      if (storedToken) setToken(storedToken);
      if (storedUserId) setUserId(storedUserId);
      if (storedUserStr) {
        try {
          setUser(JSON.parse(storedUserStr));
        } catch {
          // corrupted user data
        }
      }
    } catch {
      // localStorage not available
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUserId: string, newUser: any) => {
    setToken(newToken);
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
    setUserId(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      localStorage.removeItem('starredCases');
      localStorage.removeItem('starredPapers');
      localStorage.removeItem('pinnedPapers');
    }
  }, []);

  const refreshUser = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          const parsed = JSON.parse(storedUserStr);
          setUser(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        user,
        isAuthenticated: !!token,
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
