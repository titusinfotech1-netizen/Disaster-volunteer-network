import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, Role } from '../types';

interface AuthContextType {
  currentUser: any;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (name: string, role: Role, phone: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedProfile = localStorage.getItem('mock_user_profile');
    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile));
    }
    setLoading(false);
  }, []);

  const login = (name: string, role: Role, phone: string) => {
    const newProfile: UserProfile = {
      id: 'mock-user-' + Date.now(),
      name,
      email: 'guest@example.com',
      phone,
      role,
      createdAt: Date.now()
    };
    localStorage.setItem('mock_user_profile', JSON.stringify(newProfile));
    setUserProfile(newProfile);
  };

  const signOut = async () => {
    localStorage.removeItem('mock_user_profile');
    setUserProfile(null);
  };

  const refreshProfile = async () => {};

  return (
    <AuthContext.Provider value={{ 
      currentUser: userProfile ? { uid: userProfile.id } : null, 
      userProfile, 
      loading, 
      login, 
      signOut, 
      refreshProfile 
    }}>
      {!loading && children}
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
