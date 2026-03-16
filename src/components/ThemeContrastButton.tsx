import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeContrastButtonProps {
  variant?: 'default' | 'dock';
}

const ThemeContrastButton: React.FC<ThemeContrastButtonProps> = ({ variant = 'default' }) => {
  const { theme, setTheme } = useTheme();
  const isNoturno = theme === 'noturno';

  const toggle = () => setTheme(isNoturno ? 'claro' : 'noturno');
  const Icon = isNoturno ? Sun : Moon;

  if (variant === 'dock') {
    return (
      <button
        onClick={toggle}
        className="flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium leading-tight text-[var(--sidebar-muted)] transition-colors hover:bg-white/5 hover:text-[var(--sidebar-text)]"
        title={isNoturno ? 'Tema Claro' : 'Tema Noturno'}
        aria-label="Alternar contraste"
      >
        <Icon className="h-5 w-5" />
        <span>Tema</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--sidebar-text)] transition-colors hover:bg-white/10"
      title={isNoturno ? 'Tema Claro' : 'Tema Noturno'}
      aria-label="Alternar contraste"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

export default ThemeContrastButton;


