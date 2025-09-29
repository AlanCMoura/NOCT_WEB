import React from 'react';
import LazyImage from './LazyImage';

export interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  mode?: 'carousel' | 'grid';
}

export const getOrientation = (width: number, height: number) => {
  const aspect = width / height;
  if (aspect < 0.8) return 'portrait';
  if (aspect > 1.2) return 'landscape';
  return 'square';
};

const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className = '', onClick, onLoad, mode = 'carousel' }) => {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape' | 'square' | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setOrientation(getOrientation(naturalWidth, naturalHeight));
    if (onLoad) onLoad(e);
  };

  let imgClass = className + ' object-contain bg-[var(--hover)]';
  if (mode === 'carousel') {
    if (orientation === 'portrait') imgClass += ' h-48 w-36';
    else if (orientation === 'landscape') imgClass += ' h-48 w-64';
    else if (orientation === 'square') imgClass += ' h-48 w-48';
    else imgClass += ' h-48 w-48';
  } else {
    if (orientation === 'portrait') imgClass += ' h-40 w-24 row-span-2';
    else if (orientation === 'landscape') imgClass += ' h-24 w-40';
    else if (orientation === 'square') imgClass += ' h-32 w-32';
    else imgClass += ' h-32 w-32';
  }

  return (
    <LazyImage
      src={src}
  alt={alt || ''}
      className={imgClass}
      onClick={onClick}
      onLoad={handleLoad}
    />
  );
};

export default SmartImage;
