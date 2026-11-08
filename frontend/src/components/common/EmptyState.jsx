import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description,
  action,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[#1A222E] border border-gray-800 flex items-center justify-center mb-4 text-[#C5A46D]/80 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-semibold text-white tracking-tight mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      )}

      {React.isValidElement(action) ? (
        action
      ) : action && onAction ? (
        <Button variant="primary" size="md" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}
