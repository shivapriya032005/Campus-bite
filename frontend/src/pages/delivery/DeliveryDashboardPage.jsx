import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, CheckCircle2, Clock, MapPin, ArrowRight, Package } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Delivery Courier Hub</h1>
          <p className="text-gray-400 mt-1">Manage active campus pick-ups, routes, and drop-offs</p>
        </div>

        <Link to="/delivery/history">
          <Button variant="secondary" size="sm">
            Delivery History ({deliveredCount})
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#C5A46D]/10 text-[#C5A46D]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Assigned Pickups</span>
            <p className="text-2xl font-bold text-white">
              {deliveries.filter((d) => d.status === 'ASSIGNED').length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Out for Delivery</span>
            <p className="text-2xl font-bold text-white">
              {deliveries.filter((d) => d.status === 'OUT_FOR_DELIVERY').length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium">Completed Runs</span>
            <p className="text-2xl font-bold text-white">{deliveredCount}</p>
          </div>
        </Card>
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Active Delivery Runs</h2>

        {loading ? (
          <LoadingSpinner />
        ) : activeDeliveries.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="All caught up!"
            description="You currently have no active deliveries. When restaurants assign you to ready orders, they will appear here."
          />
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map((a) => (
              <Card key={a.id} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-750 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">Assignment #{a.id}</span>
                    <Badge status={a.status}>{a.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Assigned: {new Date(a.assigned_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase">
                      Order Reference:
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
                        Pick Up & Start Delivery
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
