import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, helperText, type = 'text', icon: Icon, className = '', id, required, ...rest },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isTextarea = type === 'textarea';

  const baseInputClasses = `
    w-full bg-[#1A222E] border rounded-lg py-2.5 text-sm text-[#FAF8F3]
    placeholder:text-[#8B9099] transition-all duration-150 outline-none
    ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}
    ${error
      ? 'border-[#C94F50] focus:ring-2 focus:ring-[#C94F50]/20'
      : 'border-gray-700/80 hover:border-gray-600 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20'
    }
    ${className}
  `;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
          {label} {required && <span className="text-[#C5A46D]">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {isTextarea ? (
          <textarea
            ref={ref}
            id={inputId}
            required={required}
            className={`${baseInputClasses} min-h-[96px] resize-y`}
            {...rest}
          />
        ) : (
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            className={baseInputClasses}
            {...rest}
          />
        )}
      </div>

      {error && <p className="text-xs text-[#C94F50] mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-[#8B9099] mt-1">{helperText}</p>}
    </div>
  );
});

export default Input;
