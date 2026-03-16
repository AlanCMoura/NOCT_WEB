import React from 'react';
import { LayoutDashboard, FileBarChart, FileText, LogOut, User as UserIcon, Users } from 'lucide-react';
import ThemeContrastButton from './ThemeContrastButton';
import { useSidebar } from '../context/SidebarContext';

interface User {
  name: string;
  role: string;
}

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface SidebarProps {
  currentPage?: string;
  onPageChange?: (pageId: string) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, user }) => {
  const { currentPage: ctxPage, changePage } = useSidebar();
  const activePage = currentPage ?? ctxPage;
  const isInspector = typeof user?.role === 'string' && user.role.toLowerCase() === 'inspetor';
  const userInitials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CV';

  const sidebarItems: SidebarItem[] = isInspector
    ? [{ id: 'operations', icon: <FileText className="h-5 w-5" />, label: 'Operacoes' }]
    : [
        { id: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
        { id: 'operations', icon: <FileText className="h-5 w-5" />, label: 'Operacoes' },
      ];

  const managementItems: SidebarItem[] = isInspector
    ? []
    : [
        { id: 'usuarios', icon: <Users className="h-5 w-5" />, label: 'Usuarios' },
        { id: 'relatorios', icon: <FileBarChart className="h-5 w-5" />, label: 'Relatorios' },
      ];

  const systemItems: SidebarItem[] = [
    { id: 'perfil', icon: <UserIcon className="h-5 w-5" />, label: 'Meu Perfil' },
    { id: 'logout', icon: <LogOut className="h-5 w-5" />, label: 'Logout' },
  ];

  const handleItemClick = (itemId: string): void => {
    changePage(itemId);
    if (onPageChange) onPageChange(itemId);
  };

  const renderNavItems = (items: SidebarItem[]): React.ReactNode =>
    items.map((item) => (
      <button
        key={item.id}
        type="button"
        title={item.label}
        onClick={() => handleItemClick(item.id)}
        className={`mb-1 flex w-full items-center justify-center gap-3 rounded-lg px-3 py-3 transition-colors md:justify-start md:py-2 ${
          activePage === item.id
            ? 'bg-[var(--primary)] text-[var(--on-primary)]'
            : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
        }`}
      >
        {item.icon}
        <span className="hidden text-sm md:inline">{item.label}</span>
      </button>
    ));

  return (
    <aside className="sidebar-wrapper sticky top-0 flex min-h-screen w-[4.5rem] flex-shrink-0 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:h-screen md:w-64">
      <div className="border-[var(--border)] p-3 md:p-4">
        <div className="flex items-center justify-center gap-3 md:justify-start">
          <div className="h-11 w-11 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5 md:h-12 md:w-12">
            <img src="/assets/logo_.png" alt="ContainerView Logo" className="h-full w-full object-contain" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold">ContainerView</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 py-4 md:px-4 md:py-6">
        <section className="mb-4 md:mb-6">
          <div className="mb-3 hidden text-xs uppercase tracking-wider text-[var(--sidebar-muted)] md:block">Principal</div>
          {renderNavItems(sidebarItems)}
        </section>

        {!isInspector && (
          <section className="mb-4 md:mb-6">
            <div className="mb-3 hidden text-xs uppercase tracking-wider text-[var(--sidebar-muted)] md:block">Gestao</div>
            {renderNavItems(managementItems)}
          </section>
        )}

        <section>
          <div className="mb-3 hidden text-xs uppercase tracking-wider text-[var(--sidebar-muted)] md:block">Sistema</div>
          {renderNavItems(systemItems)}
        </section>
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] p-3 md:flex-row md:justify-between md:p-4">
        <button
          type="button"
          onClick={() => handleItemClick('perfil')}
          aria-label="Abrir meu perfil"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-sm font-semibold text-white md:hidden"
        >
          {userInitials}
        </button>
        <span className="hidden text-xs text-[var(--sidebar-muted)] md:inline">Tema</span>
        <ThemeContrastButton />
      </div>
    </aside>
  );
};

export default Sidebar;
