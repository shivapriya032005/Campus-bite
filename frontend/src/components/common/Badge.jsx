const STATUS_STYLES = {
  // Order statuses
  PLACED: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400',
  },
  ACCEPTED: {
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  PREPARING: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  READY: {
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  ASSIGNED: {
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    dot: 'bg-teal-400',
  },
  OUT_FOR_DELIVERY: {
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    dot: 'bg-orange-400',
  },
  DELIVERED: {
    badge: 'bg-[#248A62]/15 text-[#34D399] border-[#248A62]/30',
    dot: 'bg-[#248A62]',
  },
  CANCELLED: {
    badge: 'bg-[#C94F50]/15 text-[#F87171] border-[#C94F50]/30',
    dot: 'bg-[#C94F50]',
  },
  REFUNDED: {
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
  },

  // Payment ledger / reminder states
  MOCK_PAID: {
    badge: 'bg-[#248A62]/15 text-[#34D399] border-[#248A62]/30',
    dot: 'bg-[#248A62]',
  },
  VOIDED: {
    badge: 'bg-gray-700/40 text-gray-300 border-gray-600/50',
    dot: 'bg-gray-400',
  },
  REFUND: {
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  ACTIVE: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  RESOLVED: {
    badge: 'bg-[#248A62]/15 text-[#34D399] border-[#248A62]/30',
    dot: 'bg-[#248A62]',
  },
  DISMISSED: {
    badge: 'bg-gray-800 text-gray-400 border-gray-700',
    dot: 'bg-gray-500',
  },

  // Generic variants
  success: {
    badge: 'bg-[#248A62]/15 text-[#34D399] border-[#248A62]/30',
    dot: 'bg-[#248A62]',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  error: {
    badge: 'bg-[#C94F50]/15 text-[#F87171] border-[#C94F50]/30',
    dot: 'bg-[#C94F50]',
  },
  info: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400',
  },
  gold: {
    badge: 'bg-[#C5A46D]/15 text-[#C5A46D] border-[#C5A46D]/40',
    dot: 'bg-[#C5A46D]',
  },
  default: {
    badge: 'bg-gray-800 text-gray-400 border-gray-700',
    dot: 'bg-gray-500',
  },
};

export default function Badge({ variant, status, children, dot = true, className = '' }) {
  const rawKey = status || variant || 'default';
  const key = String(rawKey).toUpperCase();
  const config = STATUS_STYLES[key] || STATUS_STYLES[rawKey] || STATUS_STYLES.default;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide
        border ${config.badge} ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span>{children || rawKey.replace(/_/g, ' ')}</span>
    </span>
  );
}
