import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  const isInspector = typeof user?.role === 'string' && user.role.toLowerCase() === 'inspetor';
  const pathname = location.pathname || '';
  const inspectorAllowed =
    pathname.startsWith('/operations') || pathname === '/profile';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] text-[var(--text)]">
        <div
          className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"
          aria-label="Carregando sessao"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isInspector && !inspectorAllowed) {
    return <Navigate to="/operations" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
