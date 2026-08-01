'use client';

import * as React from 'react';
import { Role, PermissionCode, hasPermission } from '../types/permission';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  restaurantId: string;
  restaurantName: string;
  branchId: string;
  branchName: string;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserSession) => void;
  logout: () => void;
  can: (permission: PermissionCode) => boolean;
  setBranch: (branchId: string, branchName: string) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Initial mock demo user for rapid local verification & development
const DEFAULT_DEMO_USER: UserSession = {
  id: 'usr_demo_01',
  email: 'owner@trinetra.io',
  fullName: 'Alex Mercer (Owner)',
  role: 'OWNER',
  organizationId: 'org_01',
  organizationName: 'Trinetra Hospitality Group',
  restaurantId: 'rest_01',
  restaurantName: 'Downtown Bistro',
  branchId: 'br_01',
  branchName: 'Downtown Outlet'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    // Read session from localStorage on client render
    const stored = localStorage.getItem('trinetra_session');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(DEFAULT_DEMO_USER);
      }
    } else {
      // Default to demo user if no stored session
      setUser(DEFAULT_DEMO_USER);
    }
    setIsLoading(false);
  }, []);

  const login = React.useCallback((newUser: UserSession) => {
    setUser(newUser);
    localStorage.setItem('trinetra_session', JSON.stringify(newUser));
    document.cookie = 'trinetra-session=active; path=/; max-age=86400';
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem('trinetra_session');
    document.cookie = 'trinetra-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }, []);

  const can = React.useCallback(
    (permission: PermissionCode): boolean => {
      if (!user) return false;
      return hasPermission(user.role, permission);
    },
    [user]
  );

  const setBranch = React.useCallback((branchId: string, branchName: string) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, branchId, branchName };
      localStorage.setItem('trinetra_session', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        can,
        setBranch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
