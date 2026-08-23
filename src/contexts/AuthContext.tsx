import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'operator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const MOCK_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 'usr-001',
    name: 'Alex Mercer',
    email: 'admin@safewatch.io',
    password: 'admin123',
    role: 'admin',
    avatar: 'AM',
    department: 'System Administration',
  },
  {
    id: 'usr-002',
    name: 'Jordan Chen',
    email: 'operator@safewatch.io',
    password: 'ops123',
    role: 'operator',
    avatar: 'JC',
    department: 'Operations Team',
  },
  {
    id: 'usr-003',
    name: 'Sam Patel',
    email: 'sam@safewatch.io',
    password: 'ops123',
    role: 'operator',
    avatar: 'SP',
    department: 'Operations Team',
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'safewatch_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((r) => setTimeout(r, 800)); // simulate network
    const match = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!match) {
      return { success: false, error: 'Invalid credentials. Please try again.' };
    }
    const { password: _pw, ...authUser } = match;
    setUser(authUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
