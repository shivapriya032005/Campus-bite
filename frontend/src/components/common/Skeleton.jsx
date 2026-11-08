export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-pulse bg-[#202631]/80 rounded';
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'h-4 rounded',
  };

  return <div className={`${base} ${variants[variant] || variants.rect} ${className}`} />;
}
