import { createContext, useState, useContext, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Hardcoded credentials for demo
  const DEMO_CREDENTIALS = {
    email: 'admin@aldeia.com',
    password: 'password123',
  };

  const DEMO_USER: User = {
    id: '1',
    name: 'Administrador',
    email: 'admin@aldeia.com',
    role: 'admin',
  };

  const login = async (email: string, password: string): Promise<void> => {
    // Simulate API call delay
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (
          email === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          setUser(DEMO_USER);
          localStorage.setItem('user', JSON.stringify(DEMO_USER));
          resolve();
        } else {
          reject(new Error('Email ou senha incorretos'));
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Load user from localStorage on mount
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setInitialized(true);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
