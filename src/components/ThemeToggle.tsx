import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isNoturno = theme === 'noturno';

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] transition-colors"
      aria-label="Alternar tema"
      title={isNoturno ? 'Mudar para claro' : 'Mudar para escuro'}
    >
      {isNoturno ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="text-sm">{isNoturno ? 'Claro' : 'Escuro'}</span>
    </button>
  );
};

export default ThemeToggle;


