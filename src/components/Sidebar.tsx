import React from 'react';
import { BarChart3, FileText, Users, FileBarChart, LogOut, User as UserIcon } from 'lucide-react';
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
  currentPage?: string; // opcional; provider controla se ausente
  onPageChange?: (pageId: string) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { currentPage: ctxPage, changePage } = useSidebar();
  const activePage = currentPage ?? ctxPage;

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'operations', icon: <FileText className="w-5 h-5" />, label: 'Operações' },
  ];

  const managementItems: SidebarItem[] = [
    { id: 'usuarios', icon: <Users className="w-5 h-5" />, label: 'Usuários' },
    { id: 'relatorios', icon: <FileBarChart className="w-5 h-5" />, label: 'Relatórios' },
  ];

  const systemItems: SidebarItem[] = [
    { id: 'perfil', icon: <UserIcon className="w-5 h-5" />, label: 'Meu Perfil' },
    { id: 'logout', icon: <LogOut className="w-5 h-5" />, label: 'Logout' },
  ];

  const handleItemClick = (itemId: string): void => {
    // sempre navega pelo provider
    changePage(itemId);
    if (onPageChange) onPageChange(itemId);
  };

  const renderNavItems = (items: SidebarItem[]): React.ReactNode =>
    items.map((item) => (
      <div
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 cursor-pointer transition-colors ${
          activePage === item.id
            ? 'bg-[var(--primary)] text-[var(--on-primary)]'
            : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
        }`}
      >
        {item.icon}
        <span className="text-sm">{item.label}</span>
      </div>
    ));

  return (
    <div className="w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] flex flex-col">
      <div className="p-4 border-[var(--border)]">
        <div className="flex items-center gap-3">
          {/* Fundo branco para melhor integração com o logo sem transparência */}
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-black/5 p-2">
            <img src="/assets/logo_.png" alt="ContainerView Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ContainerView</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="mb-6">
          <div className="text-xs text-[var(--sidebar-muted)] uppercase tracking-wider mb-3">Principal</div>
          {renderNavItems(sidebarItems)}
        </div>

        <div className="mb-6">
          <div className="text-xs text-[var(--sidebar-muted)] uppercase tracking-wider mb-3">Gestão</div>
          {renderNavItems(managementItems)}
        </div>

        <div>
          <div className="text-xs text-[var(--sidebar-muted)] uppercase tracking-wider mb-3">Sistema</div>
          {renderNavItems(systemItems)}
        </div>
      </div>

      {/* Botão de alternância de tema no rodapé */}
      <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--sidebar-muted)]">Tema</span>
        <ThemeContrastButton />
      </div>
    </div>
  );
};

export default Sidebar;

