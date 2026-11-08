import { useState, useEffect } from 'react';
import { Truck, CheckCircle2, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function DeliveryAssignmentPage() {
  const [readyOrders, setReadyOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, partRes] = await Promise.all([
        api.get('/orders/restaurant', { params: { status: 'READY', per_page: 50 } }),
        api.get('/deliveries/partners'),
      ]);
      setReadyOrders(ordRes.data.orders || []);
      setPartners(partRes.data || []);
    } catch (err) {
      toast.error('Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) {
      toast.error('Please select a delivery courier first');
      return;
    }
    setAssigningId(orderId);
    try {
      await api.post(`/deliveries/assign/${orderId}`, {
        delivery_partner_id: Number(partnerId),
      });
      toast.success(`Courier assigned to Order #${orderId}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Delivery Dispatch</h1>
        <p className="text-gray-400 mt-1">
          Assign campus delivery couriers to orders that are packed and READY
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : readyOrders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No orders waiting for courier"
          description="When you mark cooking orders as 'READY' in the kitchen pipeline, they will appear here for courier dispatch."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {readyOrders.map((ord) => (
            <Card key={ord.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-750 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">Order #{ord.id}</span>
                    <Badge status="READY">READY FOR PICKUP</Badge>
                  </div>
                  <span className="text-[#C5A46D] font-bold text-base">
                    ${Number(ord.total_amount).toFixed(2)}
                  </span>
                </div>

                <div className="text-xs text-gray-300 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
                    <span>Destination: {ord.delivery_address}</span>
                  </div>
                  <p className="text-gray-400">
                    <strong>Items:</strong>{' '}
                    {ord.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
                  </p>
                </div>
              </div>

              {/* Partner Select & Button */}
              <div className="pt-3 border-t border-gray-750 space-y-3">
                <label className="block text-xs font-semibold text-gray-300 uppercase">
                  Select Delivery Courier:
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#C5A46D]"
                    value={selectedPartner[ord.id] || ''}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, [ord.id]: e.target.value })
                    }
                  >
                    <option value="">-- Choose Courier --</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.phone || p.email})
                      </option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="primary"
                    loading={assigningId === ord.id}
                    disabled={!selectedPartner[ord.id]}
                    onClick={() => handleAssign(ord.id)}
                  >
                    Dispatch
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
