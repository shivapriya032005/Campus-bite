const STATUS_STYLES = {
  // Order statuses
  PLACED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  ACCEPTED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  PREPARING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  READY: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ASSIGNED: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  OUT_FOR_DELIVERY: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  DELIVERED: 'bg-green-500/15 text-green-400 border-green-500/20',
  CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/20',
  REFUNDED: 'bg-gray-500/15 text-gray-400 border-gray-500/20',

  // Generic variants
  success: 'bg-green-500/15 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/15 text-red-400 border-red-500/20',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

export default function Badge({ variant, status, children, className = '' }) {
  const key = status || variant || 'default';
  const style = STATUS_STYLES[key] || STATUS_STYLES.default;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        border ${style} ${className}
      `}
    >
      {children || key.replace(/_/g, ' ')}
    </span>
  );
}
