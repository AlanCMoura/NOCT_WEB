import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  className?: string;
  onChange: (checked: boolean) => void;
  label?: string;
  checkedLabel?: string;
  uncheckedLabel?: string;
  id?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  checkedLabel,
  uncheckedLabel,
  id,
  disabled,
  className,
}) => {
  const statusText = checked ? checkedLabel : uncheckedLabel;
  const labelId = label && id ? `${id}-label` : undefined;
  const statusId = statusText && id ? `${id}-status` : undefined;
  const containerClasses = ['flex items-center gap-3', className].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label ? (
        <span id={labelId} className="text-sm text-[var(--muted)]">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={statusId}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      {statusText ? (
        <span id={statusId} className="text-sm font-medium text-[var(--text)]">
          {statusText}
        </span>
      ) : null}
    </div>
  );
};

export default ToggleSwitch;