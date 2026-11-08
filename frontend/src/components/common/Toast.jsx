import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES = {
  success: 'bg-green-600/90 border-green-500 text-white',
  error: 'bg-red-600/90 border-red-500 text-white',
  info: 'bg-blue-600/90 border-blue-500 text-white',
  warning: 'bg-yellow-500/90 border-yellow-400 text-gray-900',
};

let toastId = 0;

function ToastItem({ toast, onDismiss }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    timerRef.current = setTimeout(() => {
      setShow(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setShow(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const Icon = ICONS[toast.type] || Info;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-300 ease-out min-w-[320px] max-w-[420px]
        ${STYLES[toast.type] || STYLES.info}
        ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={handleDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    {
      success: (msg) => addToast(msg, 'success'),
      error: (msg) => addToast(msg, 'error'),
      info: (msg) => addToast(msg, 'info'),
      warning: (msg) => addToast(msg, 'warning'),
    },
    [addToast]
  );

  // Wrap the object so the reference is stable
  const value = useRef(toast);
  value.current = toast;
  const stableValue = useRef({ get current() { return value.current; } });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export default ToastProvider;
