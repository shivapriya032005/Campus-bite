import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, DollarSign, Utensils, Star, ArrowRight, Truck, RefreshCcw, Store } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [hasNoRestaurant, setHasNoRestaurant] = useState(false);
  const [loading, setLoading] = useState(true);

  // New restaurant registration modal
  const [rName, setRName] = useState('');
  const [rCuisine, setRCuisine] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
      setHasNoRestaurant(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setHasNoRestaurant(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/restaurants', {
        name: rName.trim(),
        cuisine_type: rCuisine.trim() || null,
        address: rAddress.trim() || null,
        phone: rPhone.trim() || null,
        description: rDesc.trim() || null,
      });
      fetchDashboardData();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to create restaurant'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (hasNoRestaurant) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#C5A46D]/15 text-[#C5A46D] border border-[#C5A46D]/30 flex items-center justify-center mx-auto shadow-inner">
          <Store className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            Register Your Campus Eatery
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Set up your restaurant profile to begin listing dishes and accepting orders.
          </p>
        </div>

        <Card className="text-left">
          <form onSubmit={handleCreateRestaurant} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Restaurant Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Student Union Burger Bar"
                className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Cuisine Specialty
              </label>
              <input
                type="text"
                placeholder="e.g. Artisanal Burgers, Quinoa Bowls, Italian"
                className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                value={rCuisine}
                onChange={(e) => setRCuisine(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  placeholder="Student Center, Level 1"
                  className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                  value={rAddress}
                  onChange={(e) => setRAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 555 0199"
                  className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                  value={rPhone}
                  onChange={(e) => setRPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Description & Story
              </label>
              <textarea
                rows={2}
                placeholder="Share your culinary story and ingredients..."
                className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none"
                value={rDesc}
                onChange={(e) => setRDesc(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" fullWidth loading={creating} className="rounded-xl font-bold">
              Establish Restaurant Profile
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Gross Revenue',
      value: `$${Number(stats?.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-[#C5A46D]',
      bg: 'bg-[#C5A46D]/15',
    },
    {
      title: 'Pending Action',
      value: stats?.pending_orders || 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/15',
      hint: 'Placed or Accepted',
    },
    {
      title: 'Active Pipeline',
      value: stats?.active_orders || 0,
      icon: Clock,
      color: 'text-sky-400',
      bg: 'bg-sky-400/15',
      hint: 'Cooking / In Transit',
    },
    {
      title: 'Completed Orders',
      value: stats?.completed_orders || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/15',
    },
    {
      title: 'Total Lifetime Orders',
      value: stats?.total_orders || 0,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-400/15',
    },
    {
      title: 'Menu Offerings',
      value: stats?.total_menu_items || 0,
      icon: Utensils,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/15',
    },
    {
      title: 'Average Customer Rating',
      value: `${Number(stats?.avg_rating || 0).toFixed(1)} ★`,
      icon: Star,
      color: 'text-[#C5A46D]',
      bg: 'bg-[#C5A46D]/15',
      hint: `${stats?.total_reviews || 0} reviews`,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Restaurant Operations
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Kitchen Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Real-time kitchen display, order volume analytics, and courier assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/owner/orders">
            <Button variant="primary" size="sm">
              Live Kitchen Orders
            </Button>
          </Link>
          <Link to="/owner/menu">
            <Button variant="secondary" size="sm">
              Manage Dishes
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((sc, idx) => {
          const Icon = sc.icon;
          return (
            <Card key={idx} className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">{sc.title}</span>
                <div className={`p-2 rounded-lg ${sc.bg} ${sc.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-serif text-2xl font-bold text-white tracking-tight">
                  {sc.value}
                </span>
                {sc.hint && <p className="text-[11px] text-gray-500 mt-0.5">{sc.hint}</p>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Operations Quick Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/owner/orders">
          <Card hover className="h-full flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-white group-hover:text-[#C5A46D] transition-colors">
                Live Kitchen Pipeline
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Accept incoming orders, move tickets to PREPARING, and flag items as READY for delivery dispatch.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800/80 flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D]">
              <span>Manage Kitchen Pipeline</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/owner/deliveries">
          <Card hover className="h-full flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-white group-hover:text-[#C5A46D] transition-colors">
                Courier Dispatch
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Select available campus couriers and assign them to orders waiting on the packing counter.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800/80 flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D]">
              <span>Assign Couriers</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/owner/refunds">
          <Card hover className="h-full flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <RefreshCcw className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-white group-hover:text-[#C5A46D] transition-colors">
                Disputes & Refunds
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Review post-delivery customer claims, inspect reasons, and authorize double-entry refunds.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800/80 flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D]">
              <span>Review Claims</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
