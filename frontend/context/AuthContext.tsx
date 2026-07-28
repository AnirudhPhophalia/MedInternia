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

          localStorage.setItem("userId", id);
          localStorage.setItem("user", JSON.stringify(userData));
        }
      })
      .catch(() => {
        setUser(null);
        setUserId(null);
      })
      .finally(() => setIsLoading(false));

  }, []);

  const login = useCallback(
    (newUserId: string, newUser: any) => {
      setUserId(newUserId);
      setUser(newUser);

      if (typeof window !== "undefined") {
        localStorage.setItem("userId", newUserId);
        localStorage.setItem("user", JSON.stringify(newUser));
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed to invalidate server session during logout:", error);
    }
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
    }
  }, []);

  const refreshUser = useCallback(() => {
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

          localStorage.setItem("userId", id);
          localStorage.setItem("user", JSON.stringify(userData));
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
        isAuthenticated: !!userId ,
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
