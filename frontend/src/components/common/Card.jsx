export default function Card({
  children,
  className = '',
  hover = false,
  noPadding = false,
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#171F2C] border border-gray-800/90 rounded-xl shadow-sm shadow-black/25
        ${noPadding ? '' : 'p-5 sm:p-6'}
        ${hover ? 'transition-all duration-200 hover:border-gray-700 hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}
