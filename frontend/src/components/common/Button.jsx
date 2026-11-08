import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[#C5A46D] hover:bg-[#b8954f] text-gray-900 font-semibold shadow-sm',
  secondary:
    'bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium',
  danger:
    'bg-red-600 hover:bg-red-700 text-white font-medium',
  ghost:
    'bg-transparent hover:bg-gray-800 text-gray-300 font-medium',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center transition-all duration-200
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
