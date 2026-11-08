import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, User, Store, CheckCircle, Truck, Clock } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/deliveries/my/${id}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/deliveries/my/${id}/status`, { status: newStatus });
      toast.success(
        newStatus === 'OUT_FOR_DELIVERY'
          ? 'Order picked up! Now Out for Delivery'
          : 'Delivery marked completed!'
      );
      if (newStatus === 'DELIVERED') {
        navigate('/delivery/dashboard');
      } else {
        fetchDetail();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!data) return <div className="text-white">Delivery not found</div>;

  const { assignment, order, customer, restaurant } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link
        to="/delivery/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courier Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Delivery Assignment #{assignment.id}
            </h1>
            <Badge status={assignment.status}>{assignment.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Assigned: {new Date(assignment.assigned_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Action button */}
        <div>
          {assignment.status === 'ASSIGNED' && (
            <Button
              variant="primary"
              loading={updating}
              onClick={() => handleUpdate('OUT_FOR_DELIVERY')}
            >
              <Truck className="w-4 h-4 mr-1.5" />
              Pick Up from Kitchen
            </Button>
          )}

          {assignment.status === 'OUT_FOR_DELIVERY' && (
            <Button
              variant="primary"
              loading={updating}
              onClick={() => handleUpdate('DELIVERED')}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Complete Delivery
            </Button>
          )}
        </div>
      </div>

      {/* Pickup vs Delivery Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Restaurant Pickup */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-750 pb-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase">1. PICKUP AT</span>
              <h3 className="text-lg font-bold text-white">{restaurant.name}</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            {restaurant.address && (
              <div className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                <span>{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#C5A46D]" />
                <span>{restaurant.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Step 2: Customer Destination */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-750 pb-3">
            <div className="p-2 rounded bg-green-500/10 text-green-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase">2. DELIVER TO</span>
              <h3 className="text-lg font-bold text-white">{customer.name}</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#C5A46D]" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Order Items manifest */}
      <Card noPadding>
        <div className="p-4 border-b border-gray-750">
          <h2 className="text-base font-bold text-white">Order Manifest (Order #{order.id})</h2>
        </div>
        <div className="divide-y divide-gray-750">
          {order.items?.map((it) => (
            <div key={it.id} className="p-4 flex justify-between text-sm">
              <span className="text-white font-medium">
                {it.quantity}x {it.item_name}
              </span>
              <span className="text-gray-400">${Number(it.subtotal).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {order.special_instructions && (
          <div className="p-4 bg-gray-850 border-t border-gray-750 text-xs">
            <strong className="text-gray-400 block mb-1">Customer Special Instructions:</strong>
            <p className="text-gray-300 italic">{order.special_instructions}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

