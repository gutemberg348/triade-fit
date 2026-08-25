import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { setSessionExpiredHandler } from "../services/api.js";

const AuthContext = createContext(null);

function restoreUser() {
  try {
    const raw = localStorage.getItem("essenza.user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || typeof user !== "object" || !user.id || !user.role)
      throw new Error("Sessão local inválida");
    return user;
  } catch {
    try {
      localStorage.removeItem("essenza.accessToken");
      localStorage.removeItem("essenza.refreshToken");
      localStorage.removeItem("essenza.user");
    } catch {
      // O app continua utilizável mesmo quando o navegador bloqueia storage.
    }
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(restoreUser);
  const [booting, setBooting] = useState(true);
  const clearSession = useCallback(() => {
    localStorage.removeItem("essenza.accessToken");
    localStorage.removeItem("essenza.refreshToken");
    localStorage.removeItem("essenza.user");
    setUser(null);
  }, []);
  const saveUser = useCallback((nextUser) => {
    if (nextUser?.role !== "ADMIN")
      throw new Error("Esta conta não possui acesso administrativo.");
    localStorage.setItem("essenza.user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  useEffect(() => setSessionExpiredHandler(clearSession), [clearSession]);
  useEffect(() => {
    let mounted = true;
    const validateSession = async () => {
      if (
        !localStorage.getItem("essenza.accessToken") &&
        !localStorage.getItem("essenza.refreshToken")
      ) {
        clearSession();
        if (mounted) setBooting(false);
        return;
      }
      try {
        const { data } = await api.get("/users/me");
        if (mounted) saveUser(data);
      } catch {
        clearSession();
      } finally {
        if (mounted) setBooting(false);
      }
    };
    validateSession();
    return () => {
      mounted = false;
    };
  }, [clearSession, saveUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/admin/login", { email, password });
    localStorage.setItem("essenza.accessToken", data.accessToken);
    localStorage.setItem("essenza.refreshToken", data.refreshToken);
    saveUser(data.user);
  }, [saveUser]);
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("essenza.refreshToken");
    clearSession();
    if (refreshToken)
      api.post("/auth/logout", { refreshToken }).catch(() => null);
  }, [clearSession]);
  const value = useMemo(
    () => ({ user, booting, login, logout }),
    [user, booting, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
