import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, User, Store, CheckCircle, Truck, Clock, PackageCheck, AlertCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
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
      toast.error(getErrorMessage(err, 'Update failed'));
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
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
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
              Confirm Delivery to Student
            </Button>
          )}

          {assignment.status === 'DELIVERED' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#248A62] bg-[#248A62]/10 border border-[#248A62]/20 px-3 py-2 rounded-lg">
              <PackageCheck className="w-4 h-4" />
              Delivered Successfully
            </div>
          )}
        </div>
      </div>

      {/* Pickup vs Delivery Waypoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Restaurant Pickup */}
        <Card className="space-y-4 border border-[#1E2633]">
          <div className="flex items-center gap-3 border-b border-[#1E2633] pb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Step 1 · Kitchen Pickup
              </span>
              <h3 className="text-base font-bold text-white">{restaurant.name}</h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-gray-300">
            {restaurant.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Step 2: Customer Destination */}
        <Card className="space-y-4 border border-[#1E2633]">
          <div className="flex items-center gap-3 border-b border-[#1E2633] pb-3">
            <div className="w-10 h-10 rounded-xl bg-[#248A62]/10 border border-[#248A62]/20 flex items-center justify-center text-[#248A62] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Step 2 · Student Dropoff
              </span>
              <h3 className="text-base font-bold text-white">{customer.name}</h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-gray-300">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{customer.address || 'Address on campus file'}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Order Items manifest */}
      <Card noPadding className="border border-[#1E2633] overflow-hidden">
        <div className="p-4 border-b border-[#1E2633] bg-[#111827]/40 flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-white">
            Order Manifest (Order #{order.id})
          </h2>
          <span className="text-xs text-gray-400">{order.items?.length || 0} unique items</span>
        </div>
        <div className="divide-y divide-[#1E2633]">
          {order.items?.map((it) => (
            <div key={it.id} className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#C5A46D]/10 text-[#C5A46D] font-bold text-xs flex items-center justify-center">
                  {it.quantity}x
                </span>
                <span className="text-white font-medium">{it.item_name}</span>
              </div>
              <span className="text-gray-300 font-semibold font-mono">
                ${Number(it.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {order.special_instructions && (
          <div className="p-4 bg-[#111827]/80 border-t border-[#1E2633] flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-medium block">
                Customer Delivery Instructions:
              </strong>
              <p className="text-gray-300 mt-0.5 italic">{order.special_instructions}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

