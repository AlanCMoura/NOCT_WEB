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
    { id: 'logout', icon: <LogOut className="h-5 w-5" />, label: 'Sair' },
  ];

  const mobileDockItems: SidebarItem[] = [...sidebarItems, ...managementItems, systemItems[1]];

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

  const renderMobileNavItems = (items: SidebarItem[]): React.ReactNode =>
    items.map((item) => (
      <button
        key={item.id}
        type="button"
        title={item.label}
        onClick={() => handleItemClick(item.id)}
        className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium leading-tight transition-colors ${
          activePage === item.id
            ? 'bg-[var(--primary)] text-[var(--on-primary)]'
            : 'text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-[var(--sidebar-text)]'
        }`}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    ));

  return (
    <aside className="sidebar-wrapper flex-shrink-0">
      <div className="hidden min-h-screen flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:sticky md:top-0 md:flex md:h-screen md:w-64">
        <div className="border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
              <img src="/assets/logo_.png" alt="ContainerView Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ContainerView</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <section className="mb-6">
            <div className="mb-3 text-xs uppercase tracking-wider text-[var(--sidebar-muted)]">Principal</div>
            {renderNavItems(sidebarItems)}
          </section>

          {!isInspector && (
            <section className="mb-6">
              <div className="mb-3 text-xs uppercase tracking-wider text-[var(--sidebar-muted)]">Gestao</div>
              {renderNavItems(managementItems)}
            </section>
          )}

          <section>
            <div className="mb-3 text-xs uppercase tracking-wider text-[var(--sidebar-muted)]">Sistema</div>
            {renderNavItems(systemItems)}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] p-4">
          <span className="text-xs text-[var(--sidebar-muted)]">Tema</span>
          <ThemeContrastButton />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--sidebar-bg)]/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 text-[var(--sidebar-text)] shadow-[0_-12px_30px_rgba(15,23,42,0.18)] backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleItemClick('perfil')}
            aria-label="Abrir meu perfil"
            title="Meu Perfil"
            className={`flex min-w-[4.5rem] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium leading-tight transition-colors ${
              activePage === 'perfil'
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-[var(--sidebar-text)]'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span>Perfil</span>
          </button>
          <div className="mobile-nav-scroll flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-1">
              {renderMobileNavItems(mobileDockItems)}
            </div>
          </div>
          <ThemeContrastButton variant="dock" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
