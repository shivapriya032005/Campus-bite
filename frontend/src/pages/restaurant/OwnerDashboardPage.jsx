import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Utensils,
  Star,
  Users,
  ArrowRight,
  Plus,
} from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [hasNoRestaurant, setHasNoRestaurant] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restaurant creation modal state for new owners
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
        name: rName,
        cuisine_type: rCuisine || null,
        address: rAddress || null,
        phone: rPhone || null,
        description: rDesc || null,
      });
      setCreateModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create restaurant');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (hasNoRestaurant) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#C5A46D]/10 text-[#C5A46D] flex items-center justify-center mx-auto">
          <Utensils className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Set Up Your Restaurant</h1>
          <p className="text-gray-400 mt-2">
            You don't have a restaurant profile yet. Register your campus dining location to start accepting orders!
          </p>
        </div>

        <Card>
          <form onSubmit={handleCreateRestaurant} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Restaurant Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Campus Corner Grill"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Cuisine Type
              </label>
              <input
                type="text"
                placeholder="e.g. Burgers, Pizza, Asian, Vegan"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
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
                  placeholder="Student Center, 1st Fl"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
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
                  placeholder="+1 555 123 4567"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
                  value={rPhone}
                  onChange={(e) => setRPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary of your menu & specialties..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
                value={rDesc}
                onChange={(e) => setRDesc(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" fullWidth loading={creating}>
              Create Restaurant Profile
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${Number(stats?.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-[#C5A46D]',
      bg: 'bg-[#C5A46D]/10',
    },
    {
      title: 'Pending Action',
      value: stats?.pending_orders || 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      hint: 'Placed or Accepted',
    },
    {
      title: 'Active Orders',
      value: stats?.active_orders || 0,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      hint: 'Kitchen / In Transit',
    },
    {
      title: 'Completed Orders',
      value: stats?.completed_orders || 0,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      title: 'Total Orders',
      value: stats?.total_orders || 0,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      title: 'Menu Items',
      value: stats?.total_menu_items || 0,
      icon: Utensils,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
    },
    {
      title: 'Average Rating',
      value: `${Number(stats?.avg_rating || 0).toFixed(1)} ★`,
      icon: Star,
      color: 'text-[#C5A46D]',
      bg: 'bg-[#C5A46D]/10',
      hint: `${stats?.total_reviews || 0} reviews`,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Restaurant Overview</h1>
          <p className="text-gray-400 mt-1">Real-time kitchen metrics and operational statistics</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/owner/orders">
            <Button variant="primary" size="sm">
              Manage Orders
            </Button>
          </Link>
          <Link to="/owner/menu">
            <Button variant="secondary" size="sm">
              Manage Menu
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
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
                <span className="text-2xl font-bold text-white tracking-tight">{sc.value}</span>
                {sc.hint && <p className="text-[11px] text-gray-500 mt-0.5">{sc.hint}</p>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/owner/orders">
          <Card hover className="h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Live Kitchen Pipeline</h2>
              <p className="text-sm text-gray-400">
                Accept incoming orders, advance cooking status, and flag orders ready for delivery.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#C5A46D] mt-4">
              <span>Go to Orders</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        </Link>

        <Link to="/owner/deliveries">
          <Card hover className="h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Delivery Partner Dispatch</h2>
              <p className="text-sm text-gray-400">
                Assign campus delivery couriers to orders marked READY for dispatch.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#C5A46D] mt-4">
              <span>Assign Couriers</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        </Link>

        <Link to="/owner/refunds">
          <Card hover className="h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Refunds & Claims</h2>
              <p className="text-sm text-gray-400">
                Review, approve, or reject customer return requests with financial ledger auditing.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#C5A46D] mt-4">
              <span>Manage Claims</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

