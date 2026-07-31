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
  userId: string | null;
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, user: any) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
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
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // SECURITY: Tokens are now managed via httpOnly cookies (not localStorage)
    // Validate session with backend using cookies automatically sent via withCredentials
    api
      .get("/auth/validate-token", {
        withCredentials: true,
      })
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;

        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
        } else {
          setUserId(null);
          setUser(null);
        }
      })
      .catch(() => {
        // Session was invalid/expired (or missing) — clear in-memory state
        setUserId(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((newUserId: string, newUser: any) => {
    // SECURITY: The httpOnly cookie is set by the backend on the login response.
    // Frontend only maintains in-memory state for UI purposes — no token handling here.
    setUserId(newUserId);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed to invalidate server session during logout:", error);
    }

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

    api
      .get("/auth/validate-token", {
        withCredentials: true,
      })
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;

        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
        } else {
          setUserId(null);
          setUser(null);
        }
      })
      .catch(() => {
        setUserId(null);
        setUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        user,
        isAuthenticated: !!userId,
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