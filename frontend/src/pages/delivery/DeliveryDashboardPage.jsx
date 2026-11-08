import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, CheckCircle2, Clock, MapPin, ArrowRight, Package, Navigation, Store } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function DeliveryDashboardPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const toast = useToast();

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deliveries/my');
      setDeliveries(res.data || []);
    } catch (err) {
      toast.error('Failed to load your assigned deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    setUpdatingId(assignmentId);
    try {
      await api.patch(`/deliveries/my/${assignmentId}/status`, { status: newStatus });
      toast.success(
        newStatus === 'OUT_FOR_DELIVERY'
          ? 'Order picked up! Now Out for Delivery'
          : 'Order marked Delivered!'
      );
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeDeliveries = deliveries.filter((d) => d.status !== 'DELIVERED');
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A46D] block mb-1">
            Campus Courier Hub
          </span>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            Delivery Operations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage active campus pick-ups, route manifests, and student drop-offs
          </p>
        </div>

        <Link to="/delivery/history">
          <Button variant="secondary" size="sm">
            Delivery History ({deliveredCount}) <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 border border-[#1E2633] p-5">
          <div className="w-12 h-12 rounded-xl bg-[#C5A46D]/10 border border-[#C5A46D]/20 flex items-center justify-center text-[#C5A46D] shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Assigned Pickups</span>
            <p className="text-2xl font-bold text-white mt-0.5">
              {deliveries.filter((d) => d.status === 'ASSIGNED').length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-[#1E2633] p-5">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Out for Delivery</span>
            <p className="text-2xl font-bold text-white mt-0.5">
              {deliveries.filter((d) => d.status === 'OUT_FOR_DELIVERY').length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-[#1E2633] p-5">
          <div className="w-12 h-12 rounded-xl bg-[#248A62]/10 border border-[#248A62]/20 flex items-center justify-center text-[#248A62] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Completed Runs</span>
            <p className="text-2xl font-bold text-white mt-0.5">{deliveredCount}</p>
          </div>
        </Card>
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-white">Active Delivery Runs</h2>
          <span className="text-xs text-gray-400">{activeDeliveries.length} in progress</span>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : activeDeliveries.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="All Caught Up!"
            description="You currently have no active deliveries. When restaurants assign you to ready campus orders, they will appear here."
            action={
              <Link to="/delivery/history">
                <Button variant="secondary" size="sm">
                  View Past History
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map((a) => (
              <Card
                key={a.id}
                className="space-y-4 border border-[#1E2633] hover:border-gray-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2633] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-white">
                      Assignment #{a.id}
                    </span>
                    <Badge status={a.status}>{a.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Assigned: {new Date(a.assigned_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Target Order
                    </span>
                    <p className="text-sm font-bold text-white">Order #{a.order_id}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/delivery/orders/${a.id}`}>
                      <Button size="sm" variant="secondary">
                        View Trip Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>

                    {a.status === 'ASSIGNED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={updatingId === a.id}
                        onClick={() => handleUpdateStatus(a.id, 'OUT_FOR_DELIVERY')}
                      >
                        <Truck className="w-3.5 h-3.5 mr-1" />
                        Pick Up & Start Run
                      </Button>
                    )}

                    {a.status === 'OUT_FOR_DELIVERY' && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={updatingId === a.id}
                        onClick={() => handleUpdateStatus(a.id, 'DELIVERED')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

