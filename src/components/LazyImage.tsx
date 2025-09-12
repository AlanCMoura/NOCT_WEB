import React, { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  style?: React.CSSProperties;
  decoding?: 'sync' | 'async' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
};

const LazyImage: React.FC<Props> = ({
  src,
  alt,
  className,
  width,
  height,
  onClick,
  onLoad,
  style,
  decoding = 'async',
  fetchPriority = 'low',
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy available; no need to observe for setting src
      setIsInView(true);
      return;
    }
    const el = imgRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      className={className}
      width={width as any}
      height={height as any}
      loading="lazy"
      decoding={decoding}
      fetchPriority={fetchPriority}
      onClick={onClick}
      onLoad={onLoad}
      style={style}
    />
  );
};

export default LazyImage;

