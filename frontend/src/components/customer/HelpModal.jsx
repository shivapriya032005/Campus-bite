import { HelpCircle, ShieldCheck } from 'lucide-react';
import Modal from '../common/Modal';

export default function HelpModal({ isOpen, onClose }) {
  const FAQS = [
    {
      q: 'How does campus dorm delivery work?',
      a: 'Student couriers pick up orders directly from campus dining halls and deliver them straight to your dorm lobby or designated pickup station.',
    },
    {
      q: 'Can I cancel an order once placed?',
      a: 'Yes, cancellations are permitted while your order is in PLACED status before the kitchen accepts it.',
    },
    {
      q: 'What if an item is missing or incorrect?',
      a: 'Navigate to your Orders page, open the completed order, and click "Request Refund" to initiate a dispute. Kitchen owners resolve claims directly.',
    },
    {
      q: 'How does the background reminder system work?',
      a: 'If a kitchen has not accepted or prepared an order after 15 minutes, automated alerts are dispatched to prioritize your ticket.',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CampusBite Help & Support" size="md">
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1E2633] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#248A62]/10 text-[#248A62]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Campus Food Concierge</h4>
              <p className="text-[11px] text-gray-400">Operating daily 8:00 AM – Midnight</p>
            </div>
          </div>
          <span className="text-[10px] text-[#248A62] font-bold bg-[#248A62]/15 px-2 py-0.5 rounded-full">
            Active Now
          </span>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Frequently Asked Questions
          </h4>
          {FAQS.map((faq, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#111827] border border-[#1E2633] space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
                {faq.q}
              </h5>
              <p className="text-[11px] text-gray-400 pl-5 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-xs text-gray-500">
          Need direct assistance? Email{' '}
          <span className="text-[#C5A46D] font-mono">support@campusbite.edu</span>
        </div>
      </div>
    </Modal>
  );
}

