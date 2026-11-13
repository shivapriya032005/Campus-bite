import { Link } from 'react-router-dom';
import { UtensilsCrossed, Shield, Sparkles, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/80 bg-[#0E141E] text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#C5A46D]/15 border border-[#C5A46D]/30 flex items-center justify-center text-[#C5A46D]">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                campus<span className="text-[#C5A46D]">bite</span>
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              The premier culinary ordering, kitchen dispatch, and student courier platform crafted exclusively for university life.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#8B9099]">
              <span className="w-2 h-2 rounded-full bg-[#248A62]" />
              <span>Campus Delivery Active & Guaranteed</span>
            </div>
          </div>

          {/* Customer Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dining & Orders</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/restaurants" className="hover:text-white transition-colors">
                  Explore Restaurants
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white transition-colors">
                  Track Active Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  Your Cart
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-white transition-colors flex items-center gap-1.5 text-[#C5A46D]">
                  <Sparkles className="w-3.5 h-3.5" /> AI Order Insights
                </Link>
              </li>
            </ul>
          </div>

          {/* Restaurant & Courier Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Partner Hub</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/owner/dashboard" className="hover:text-white transition-colors">
                  Kitchen Portal
                </Link>
              </li>
              <li>
                <Link to="/owner/menu" className="hover:text-white transition-colors">
                  Live Menu Management
                </Link>
              </li>
              <li>
                <Link to="/delivery/dashboard" className="hover:text-white transition-colors">
                  Student Courier Hub
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Partner Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security & Standards</h4>
            <div className="space-y-2.5 text-xs text-gray-400">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                <span>Audited double-entry mock ledger transaction guarantee.</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                <span>Automated 15-minute kitchen reminder monitoring.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 mt-8 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} CampusBite Inc. All rights reserved.</p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Engineered with precision for campus dining</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

