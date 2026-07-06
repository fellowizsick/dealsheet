"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("rea_token");
    const u = localStorage.getItem("rea_user");
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
    }
    setLoading(false);
  }, []);

  const login = useCallback((tokenVal, userVal) => {
    localStorage.setItem("rea_token", tokenVal);
    localStorage.setItem("rea_user", JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("rea_token");
    localStorage.removeItem("rea_user");
    setToken(null);
    setUser(null);
  }, []);

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...options.headers };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) logout();
      return res;
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
