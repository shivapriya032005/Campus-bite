import { useState, useEffect } from 'react';
import { Truck, MapPin } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
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
      toast.error('Please select an active delivery courier');
      return;
    }
    setAssigningId(orderId);
    try {
      await api.post(`/deliveries/assign/${orderId}`, {
        delivery_partner_id: Number(partnerId),
      });
      toast.success(`Courier dispatched to Order #${orderId}!`);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Courier assignment failed'));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1 border-b border-gray-800 pb-5">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Courier Operations
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Delivery Courier Dispatch
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Assign verified student couriers to orders that are packed and READY for dorm delivery.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : readyOrders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No packed orders awaiting courier"
          description="When your kitchen marks orders as 'READY' in the kitchen pipeline, they will appear here for courier dispatch."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {readyOrders.map((ord) => (
            <Card key={ord.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg font-bold text-white">Order #{ord.id}</span>
                    <Badge status="READY">READY FOR DISPATCH</Badge>
                  </div>
                  <span className="font-serif font-bold text-[#C5A46D] text-base">
                    ${Number(ord.total_amount).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#141B24] border border-gray-800 text-xs space-y-2">
                  <div className="flex items-start gap-1.5 text-gray-200">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-gray-400 font-semibold">Drop-off:</strong> {ord.delivery_address}
                    </span>
                  </div>

                  <p className="text-gray-400">
                    <strong className="text-gray-300">Items:</strong>{' '}
                    {ord.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
                  </p>
                </div>
              </div>

              {/* Courier Selection & Dispatch */}
              <div className="pt-3 border-t border-gray-800/80 space-y-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase">
                  Select Campus Courier:
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] text-white text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer"
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
                    className="rounded-xl px-4"
                  >
                    Dispatch Courier
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
