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
  login: (userId: string, user: any) => void;
  logout: () => Promise<void>;
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
  logout: async () => {},
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

    // Rely on HttpOnly cookies for session authentication.
    api
      .get("/auth/validate-token")
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
          setToken("authenticated");
        } else {
          setToken(null);
          setUserId(null);
          setUser(null);
        }
      })
      .catch(() => {
        setToken(null);
        setGlobalToken(null);
        setUserId(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    (newUserId: string, newUser: any) => {
      // The server has already set the HttpOnly session cookie.  Do not retain
      // a copy of its token in JavaScript memory or browser storage.
      setToken("authenticated");
      setGlobalToken(null);
      setUserId(newUserId);
      setUser(newUser);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
      }
    },
    [],
  );

  const logout = useCallback(async () => {
<<<<<<< HEAD
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed to invalidate server session during logout:", error);
    }
=======
    // Send this before clearing client state so the cookie-backed server
    // session can be revoked as well as removed.
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear the local session even when the server session is already gone.
    }

>>>>>>> 4c0b4e7 (fix(auth): remove sensitive auth data from localStorage)
    setToken(null);
    setGlobalToken(null);
    setUserId(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("starredCases");
      localStorage.removeItem("starredPapers");
      localStorage.removeItem("pinnedPapers");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = "auth_status=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = "refresh_token=; Path=/; Max-Age=0; SameSite=Lax";
    }
  }, []);

  const refreshUser = useCallback(() => {
    if (typeof window === "undefined") return;

    api
      .get("/auth/validate-token")
      .then((res) => {
        const userData = res.data?.user || res.data?.data?.user;
        if (userData) {
          const id = String(userData._id || userData.id);
          setUserId(id);
          setUser(userData);
          setToken((prev) => prev || "authenticated");
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
        isAuthenticated: !!token || !!userId || !!user,
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
