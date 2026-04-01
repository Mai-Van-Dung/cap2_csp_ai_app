import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

  const login = async (email, password) => {
    setLoading(true);
    await fakeDelay();
    setUser({ id: 1, name: 'Supervisor', email, role: 'viewer' });
    setLoading(false);
  };

  const register = async (name, email, password) => {
    setLoading(true);
    await fakeDelay();
    setUser({ id: 1, name: name || 'New User', email, role: 'viewer' });
    setLoading(false);
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
