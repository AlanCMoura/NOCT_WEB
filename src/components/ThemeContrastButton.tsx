import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeContrastButton: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isNoturno = theme === 'noturno';

  const toggle = () => setTheme(isNoturno ? 'claro' : 'noturno');

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)]"
      title={isNoturno ? 'Tema Claro' : 'Tema Noturno'}
      aria-label="Alternar contraste"
    >
      {isNoturno ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default ThemeContrastButton;


