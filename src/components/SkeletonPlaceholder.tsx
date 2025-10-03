import React from 'react';

interface SkeletonPlaceholderProps {
  className?: string;
}

const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps> = ({ className = '' }) => {
  const classes = ['bg-[var(--hover)]', 'rounded-md', className].filter(Boolean).join(' ');
  return <div className={classes} />;
};

export default SkeletonPlaceholder;
