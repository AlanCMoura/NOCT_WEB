import React, { createContext, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SidebarPage =
  | 'dashboard'
  | 'operations'
  | 'usuarios'
  | 'relatorios'
  | 'perfil'
  | 'cadastrar'
  | 'logout'
  | string;

interface SidebarContextValue {
  currentPage: SidebarPage;
  setCurrentPage: (page: SidebarPage) => void;
  isCollapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  changePage: (pageId: SidebarPage) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const initialPage = useMemo<SidebarPage>(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/operations')) return 'operations';
    if (path.startsWith('/users')) return 'usuarios';
    if (path.startsWith('/reports')) return 'relatorios';
    if (path.startsWith('/profile')) return 'perfil';
    return 'dashboard';
  }, [location.pathname]);

  const [currentPage, setCurrentPage] = useState<SidebarPage>(initialPage);

  const changePage = (pageId: SidebarPage) => {
    setCurrentPage(pageId);
    switch (pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'perfil':
        navigate('/profile');
        break;
      case 'usuarios':
        navigate('/users');
        break;
      case 'relatorios':
        navigate('/reports');
        break;
      case 'cadastrar':
        navigate('/register-inspector');
        break;
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const value = useMemo<SidebarContextValue>(() => ({
    currentPage,
    setCurrentPage,
    isCollapsed,
    setCollapsed: setIsCollapsed,
    toggleCollapsed: () => setIsCollapsed((v) => !v),
    changePage,
  }), [currentPage, isCollapsed]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
};

