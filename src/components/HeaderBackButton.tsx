import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({ onClick, label = 'Voltar', className = '' }) => {
  const classes = ['inline-flex items-center gap-2 text-sm font-medium text-[var(--text)] hover:text-teal-600 transition-colors', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" onClick={onClick} className={classes}>
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
};

export default HeaderBackButton;
