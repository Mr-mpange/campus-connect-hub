import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "admin" | "lecturer" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  studentId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demo
const MOCK_USERS: Record<string, User> = {
  "admin@university.edu": {
    id: "1",
    name: "Dr. James Okonkwo",
    email: "admin@university.edu",
    role: "admin",
  },
  "lecturer@university.edu": {
    id: "2",
    name: "Prof. Amina Yusuf",
    email: "lecturer@university.edu",
    role: "lecturer",
    department: "Computer Science",
  },
  "student@university.edu": {
    id: "3",
    name: "David Mwangi",
    email: "student@university.edu",
    role: "student",
    department: "Computer Science",
    studentId: "CSC/2023/001",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, _password: string) => {
    const found = MOCK_USERS[email.toLowerCase()];
    if (!found) throw new Error("Invalid credentials");
    setUser(found);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
