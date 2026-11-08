import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, helperText, type = 'text', className = '', id, ...rest },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isTextarea = type === 'textarea';

  const sharedClasses = `
    w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-sm text-white
    placeholder:text-gray-500 transition-all duration-200 outline-none
    ${error
      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-gray-700 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20'
    }
    ${className}
  `;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      {isTextarea ? (
        <textarea
          ref={ref}
          id={inputId}
          className={`${sharedClasses} min-h-[100px] resize-y`}
          {...rest}
        />
      ) : (
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={sharedClasses}
          {...rest}
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
});

export default Input;
