// src/context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../api/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const data = await getCurrentUser();
      setUser(data); // will be null if not logged in
    } catch (err) {
      console.warn('Failed to fetch current user:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
