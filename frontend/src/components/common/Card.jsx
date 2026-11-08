export default function Card({
  children,
  className = '',
  hover = false,
  noPadding = false,
}) {
  return (
    <div
      className={`
        bg-gray-800/50 border border-gray-700/50 rounded-xl
        ${noPadding ? '' : 'p-6'}
        ${hover ? 'transition-all duration-200 hover:bg-gray-800/80 hover:border-gray-600/50 hover:shadow-lg' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
