import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, clearToken, getToken, getStoredUser, setStoredUser } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const isAuthed = Boolean(getToken() && user?.username);
  const role = user?.role || null;

  const login = useCallback(async (u, p, selectedRole) => {
    const { token, username, role, displayName } = await api.login(u, p, selectedRole);
    const nextUser = { username, role, displayName: displayName || username };
    setToken(token);
    setStoredUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, username, role, displayName } = await api.register(payload);
    const nextUser = { username, role, displayName: displayName || username };
    setToken(token);
    setStoredUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('cz-unauthorized', onUnauthorized);
    return () => window.removeEventListener('cz-unauthorized', onUnauthorized);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, username: user?.username || null, role, isAuthed, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
