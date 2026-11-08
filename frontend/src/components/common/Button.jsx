import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[#C5A46D] hover:bg-[#b8955a] text-gray-950 font-semibold shadow-sm shadow-[#C5A46D]/15 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#C5A46D]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  secondary:
    'bg-[#202631] hover:bg-gray-750 text-gray-100 border border-gray-700/70 font-medium active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  outline:
    'bg-transparent hover:bg-[#202631] text-gray-200 border border-gray-700 font-medium active:scale-[0.98]',
  'gold-outline':
    'bg-transparent hover:bg-[#C5A46D]/10 text-[#C5A46D] border border-[#C5A46D]/60 hover:border-[#C5A46D] font-medium active:scale-[0.98]',
  danger:
    'bg-[#C94F50] hover:bg-red-700 text-white font-medium active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-red-500',
  ghost:
    'bg-transparent hover:bg-[#202631] text-gray-300 hover:text-white font-medium active:scale-[0.98]',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1',
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-2.5 text-base rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center transition-all duration-150 select-none
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}
      `}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
