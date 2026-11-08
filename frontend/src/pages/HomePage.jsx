import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle,
  Activity,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function HomePage() {
  const [health, setHealth] = useState('checking');
  const { user } = useAuth();

  useEffect(() => {
    api
      .get('/health')
      .then(() => setHealth('connected'))
      .catch(() => setHealth('unavailable'));
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C5A46D]/10 border border-[#C5A46D]/30 text-[#C5A46D] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Campus Dining Reimagined with AI Insights</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Savor Every Moment.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#C5A46D] to-amber-200">
            Delivered Straight to Campus.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          The all-in-one culinary platform for students, faculty, campus eateries, and student couriers.
          Real-time tracking, transparent ledgers, and AI-powered order intelligence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/restaurants">
            <Button variant="primary" size="lg" className="shadow-lg shadow-[#C5A46D]/20">
              Explore Restaurants <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          {!user ? (
            <Link to="/register">
              <Button variant="secondary" size="lg">
                Create Account
              </Button>
            </Link>
          ) : (
            <Link
              to={
                user.role?.toLowerCase() === 'owner'
                  ? '/owner/dashboard'
                  : user.role?.toLowerCase() === 'delivery'
                  ? '/delivery/dashboard'
                  : '/orders'
              }
            >
              <Button variant="secondary" size="lg">
                Go to Your Dashboard
              </Button>
            </Link>
          )}
        </div>

        {/* Live System Health Badge */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/80 border border-gray-750 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                health === 'connected'
                  ? 'bg-green-400 shadow-sm shadow-green-400/50 animate-pulse'
                  : health === 'checking'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-gray-400">
              System Core & MySQL:{' '}
              <strong className="text-white">
                {health === 'connected'
                  ? 'Online'
                  : health === 'checking'
                  ? 'Connecting...'
                  : 'Offline'}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-6">
        <Card hover className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#C5A46D]/10 text-[#C5A46D] flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">For Students & Foodies</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Order fresh meals from top campus kitchens. Track every step from kitchen prep to room drop-off,
            leave reviews, and request refunds seamlessly.
          </p>
          <ul className="text-xs text-gray-400 space-y-1.5 pt-2 border-t border-gray-750">
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#C5A46D]" /> Single-restaurant cart validation
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#C5A46D]" /> Real-time status progression
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#C5A46D]" /> Instant mock payment ledger
            </li>
          </ul>
        </Card>

        <Card hover className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">For Restaurant Owners</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Streamlined kitchen display: accept orders, transition cooking milestones, dispatch available
            couriers, adjust menus in real-time, and manage claims.
          </p>
          <ul className="text-xs text-gray-400 space-y-1.5 pt-2 border-t border-gray-750">
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Real-time kitchen ticket management
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Automated 15-min stale order reminders
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Financial ledger and refund controls
            </li>
          </ul>
        </Card>

        <Card hover className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">For Delivery Couriers</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Flexible campus gig management: receive targeted dispatched orders, access clear pickup and
            dorm location manifests, and advance delivery statuses.
          </p>
          <ul className="text-xs text-gray-400 space-y-1.5 pt-2 border-t border-gray-750">
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Strict courier isolation & security
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Complete drop-off manifests & contacts
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Complete trip fulfillment history
            </li>
          </ul>
        </Card>
      </section>

      {/* AI Callout Banner */}
      <section className="max-w-6xl mx-auto">
        <Card className="bg-gradient-to-r from-gray-850 via-gray-800 to-gray-850 border border-[#C5A46D]/30 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A46D] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Powered by OpenAI
              </div>
              <h2 className="text-2xl font-bold text-white">CampusBite AI Order Intelligence</h2>
              <p className="text-sm text-gray-300 max-w-xl">
                Ask natural questions about your order history, spending habits, favorite foods, and active
                deliveries with verified server-side privacy isolation.
              </p>
            </div>
            <Link to="/insights">
              <Button variant="primary" size="md">
                Try AI Insights <Sparkles className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
