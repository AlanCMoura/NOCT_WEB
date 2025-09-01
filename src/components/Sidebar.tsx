import React from 'react';
import { BarChart3, FileText, Users, FileBarChart, LogOut, User as UserIcon } from 'lucide-react';

// Interfaces
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
  currentPage: string;
  onPageChange?: (pageId: string) => void;
  user: User;
}

// Componente Sidebar
const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, user }) => {
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'operations', icon: <FileText className="w-5 h-5" />, label: 'Operações' }
  ];

  const managementItems: SidebarItem[] = [
    { id: 'usuarios', icon: <Users className="w-5 h-5" />, label: 'Usuários' },
    { id: 'relatorios', icon: <FileBarChart className="w-5 h-5" />, label: 'Relatórios' }
  ];

  const systemItems: SidebarItem[] = [
    { id: 'perfil', icon: <UserIcon className="w-5 h-5" />, label: 'Meu Perfil' },
    { id: 'logout', icon: <LogOut className="w-5 h-5" />, label: 'Logout' }
  ];
  

  const handleItemClick = (itemId: string): void => {
    if (onPageChange) {
      onPageChange(itemId);
    }
  };

  const renderNavItems = (items: SidebarItem[]): React.ReactNode => {
    return items.map((item: SidebarItem) => (
      <div
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 cursor-pointer transition-colors ${
          currentPage === item.id ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-700'
        }`}
      >
        {item.icon}
        <span className="text-sm">{item.label}</span>
      </div>
    ));
  };

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20 p-2">
              <img 
                src="/assets/logo_.png" 
                alt="ContainerView Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          <div>
            <h1 className="text-xl font-bold">ContainerView</h1>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 py-6">
        <div className="mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Principal</div>
          {renderNavItems(sidebarItems)}
        </div>

        <div className="mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Gestão</div>
          {renderNavItems(managementItems)}
        </div>

        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Sistema</div>
          {renderNavItems(systemItems)}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
