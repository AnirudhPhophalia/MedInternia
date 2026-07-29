import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "../utils/api";

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

export const setGlobalToken = (t: string | null) => {
  _globalToken = t;
};
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // SECURITY: Tokens are now managed via httpOnly cookies (not localStorage)
    // Validate token with backend using cookies automatically sent via withCredentials
    api
      .get("/auth/validate-token")
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          // Set in-memory state for UI, but don't persist to localStorage
          setUserId(id);
          setUser(userData);
          setToken("authenticated"); // Marker that session exists via cookie
          setGlobalToken("authenticated");
        } else {
          setToken(null);
          setGlobalToken(null);
          setUserId(null);
          setUser(null);
        }
      })
      .catch(() => {
        // Token was invalid/expired (or missing) — clear in-memory state
        setToken(null);
        setGlobalToken(null);
        setUserId(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    (newToken: string, newUserId: string, newUser: any) => {
      // SECURITY: Tokens are stored in httpOnly cookies by the backend
      // Frontend only maintains in-memory state for UI purposes
      setToken("authenticated"); // Marker that session exists
      setGlobalToken("authenticated");
      setUserId(newUserId);
      setUser(newUser);
      // Note: No localStorage usage to prevent XSS token theft
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed to invalidate server session during logout:", error);
    }

    setToken(null);
    setGlobalToken(null);
    setUserId(null);
    setUser(null);

    if (typeof window !== "undefined") {
      // Clear non-auth localStorage items only (starred cases, papers, etc)
      localStorage.removeItem("starredCases");
      localStorage.removeItem("starredPapers");
      localStorage.removeItem("pinnedPapers");
      // Note: httpOnly cookies are cleared server-side via /auth/logout
      // Frontend cannot clear httpOnly cookies (that's the security benefit)
    }
  }, []);

  const refreshUser = useCallback(() => {
    if (typeof window === "undefined") return;

    // SECURITY: Token is now in httpOnly cookie, not localStorage
    // Validate token with backend using cookies automatically sent via withCredentials
    api
      .get("/auth/validate-token")
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
          setToken("authenticated");
          setGlobalToken("authenticated");
        } else {
          setToken(null);
          setGlobalToken(null);
          setUserId(null);
          setUser(null);
        }
      })
      .catch(() => {
        setToken(null);
        setGlobalToken(null);
        setUserId(null);
        setUser(null);
      });
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
