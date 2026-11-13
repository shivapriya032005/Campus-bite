import { Clock, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';

export default function OffersModal({ isOpen, onClose }) {
  const OFFERS = [
    {
      code: 'CAMPUSFIRST',
      title: 'Free Dorm Delivery on Your First 3 Orders',
      desc: 'Applicable automatically at checkout on all campus food orders above $10.',
      expiry: 'Valid throughout the semester',
      badge: 'Student Special',
    },
    {
      code: 'NIGHTOWL',
      title: 'Late Night Study Session Boost',
      desc: 'Free espresso or garlic bread on orders placed after 9:00 PM at participating eateries.',
      expiry: '9:00 PM - 12:00 AM Daily',
      badge: 'Late Night',
    },
    {
      code: 'HEALTHYWEEK',
      title: 'Wholesome Bowls 15% Bonus Token',
      desc: 'Order any salad bowl or fresh juice from Green Fuel to unlock priority delivery.',
      expiry: 'Active this week',
      badge: 'Wellness',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Active Campus Promotions" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          CampusBite student offers are pre-configured and applied directly at checkout — no coupon code typing required!
        </p>

        <div className="space-y-3">
          {OFFERS.map((offer) => (
            <div
              key={offer.code}
              className="p-4 rounded-xl bg-[#111827] border border-[#1E2633] space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#C5A46D]/15 border border-[#C5A46D]/30 text-[#C5A46D] text-[10px] font-bold uppercase tracking-wider">
                  {offer.badge}
                </span>
                <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-500" />
                  {offer.expiry}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{offer.title}</h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{offer.desc}</p>
              </div>

              <div className="pt-2 border-t border-[#1E2633] flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#C5A46D]">{offer.code}</span>
                <span className="text-[11px] text-[#248A62] font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Auto-applied in basket
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

