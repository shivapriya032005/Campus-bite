import { useState } from 'react';
import { PLACEHOLDERS } from '../../utils/imageRegistry';

/**
 * SafeImage Component
 * - Displays a loading skeleton until image loads
 * - Graceful fallback on network error
 * - Proper object-fit: cover and aspect ratio
 * - Native lazy loading support
 */
export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = PLACEHOLDERS.food,
  aspectRatio = 'aspect-video',
  loading = 'lazy',
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const finalSrc = error || !src ? fallbackSrc : src;

  return (
    <div className={`relative overflow-hidden bg-[#1A222E] ${aspectRatio} ${className}`}>
      {/* Skeleton Pulse while loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-[#202631] animate-pulse" />
      )}

      <img
        src={finalSrc}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!error) {
            setError(true);
            setLoaded(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
}

