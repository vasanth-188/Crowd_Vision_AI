import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple local storage based auth for demo purposes
// In production, this should be replaced with a proper auth provider like Supabase

// Storage Keys for Browser's localStorage:
// 1. 'crowdvision_auth' - Stores current logged-in user (email, id, createdAt)
// 2. 'crowdvision_users' - Stores all registered users with hashed passwords
//
// Data Storage Location: Browser localStorage (F12 > Application > Local Storage > http://localhost:8080)
// Password Security: SHA-256 hash (not plain text)
//
// Example stored data structure:
// crowdvision_users: [
//   {
//     id: "uuid-string",
//     email: "user@example.com", 
//     password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // SHA-256 hash
//     createdAt: "2026-02-27T10:30:00.000Z"
//   }
// ]
const AUTH_STORAGE_KEY = 'crowdvision_auth';
const USERS_STORAGE_KEY = 'crowdvision_users';

interface StoredUser {
  id: string;
  email: string;
  password: string; // hashed
  createdAt: string;
}

function getStoredUsers(): StoredUser[] {
  try {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getStoredAuth(): User | null {
  try {
    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (auth) {
      const parsed = JSON.parse(auth);
      return { ...parsed, createdAt: new Date(parsed.createdAt) };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredAuth(user: User | null) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = getStoredAuth();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  async function hashPassword(password: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const users = getStoredUsers();
    const passwordHash = await hashPassword(password);
    const foundUser = users.find(u => u.email === email && u.password === passwordHash);
    
    if (!foundUser) {
      return { error: 'Invalid email or password' };
    }

    const loggedInUser: User = {
      id: foundUser.id,
      email: foundUser.email,
      createdAt: new Date(foundUser.createdAt),
    };

    setUser(loggedInUser);
    saveStoredAuth(loggedInUser);
    return {};
  };

  const signUp = async (email: string, password: string): Promise<{ error?: string }> => {
    const users = getStoredUsers();
    
    if (users.find(u => u.email === email)) {
      return { error: 'An account with this email already exists' };
    }

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email,
      password: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    const loggedInUser: User = {
      id: newUser.id,
      email: newUser.email,
      createdAt: new Date(newUser.createdAt),
    };

    setUser(loggedInUser);
    saveStoredAuth(loggedInUser);
    return {};
  };

  const signOut = () => {
    setUser(null);
    saveStoredAuth(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
