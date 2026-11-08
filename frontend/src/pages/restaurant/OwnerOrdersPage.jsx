import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle, Truck, Utensils, MapPin, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const STATUS_TABS = [
  { label: 'All Kitchen Tickets', value: '' },
  { label: 'Pending (Placed)', value: 'PLACED' },
  { label: 'Cooking (Preparing)', value: 'PREPARING' },
  { label: 'Packed (Ready)', value: 'READY' },
  { label: 'Completed', value: 'DELIVERED' },
];

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState(null);
  const perPage = 10;

  const toast = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/restaurant', {
        params: {
          status: statusFilter || undefined,
          page,
          per_page: perPage,
        },
      });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load restaurant orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleStatusTransition = async (orderId, newStatus) => {
    setActionId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order #${orderId} moved to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Status transition failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Kitchen Operations
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Live Order Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Accept incoming orders, advance kitchen cooking tickets, and flag orders ready for courier dispatch.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                  : 'bg-[#171F2C] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders in pipeline"
          description={
            statusFilter
              ? `No tickets currently match the "${statusFilter}" status filter.`
              : 'Your kitchen currently has no active incoming orders.'
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="space-y-4">
              {/* Ticket Top bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-lg font-bold text-white">Order #{o.id}</span>
                  <Badge status={o.status}>{o.status.replace(/_/g, ' ')}</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Received: {new Date(o.created_at).toLocaleTimeString()}</span>
                  </div>
                  <span className="font-serif font-bold text-[#C5A46D] text-base">
                    ${Number(o.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items & Dorm Location details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#141B24] border border-gray-800 space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Kitchen Items ({o.items?.length || 0}):
                  </span>
                  <ul className="space-y-1.5">
                    {o.items?.map((it) => (
                      <li key={it.id} className="flex justify-between text-gray-200">
                        <span className="font-medium">
                          {it.quantity}x {it.item_name}
                        </span>
                        <span className="text-gray-400">${Number(it.subtotal).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141B24] border border-gray-800 space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A46D]" />
                    Delivery Destination:
                  </span>
                  <p className="text-gray-200 font-medium">{o.delivery_address}</p>
                  {o.special_instructions && (
                    <div className="mt-2 pt-2 border-t border-gray-800 text-gray-400 italic">
                      <strong className="text-gray-300">Kitchen Note:</strong> "{o.special_instructions}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status Advancement Actions */}
              <div className="pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-400">
                  Current Pipeline Milestone: <strong className="text-white">{o.status}</strong>
                </div>

                <div className="flex flex-wrap gap-2">
                  {o.status === 'PLACED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={actionId === o.id}
                      onClick={() => handleStatusTransition(o.id, 'ACCEPTED')}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Accept Order
                    </Button>
                  )}

                  {o.status === 'ACCEPTED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={actionId === o.id}
                      onClick={() => handleStatusTransition(o.id, 'PREPARING')}
                    >
                      <Utensils className="w-3.5 h-3.5 mr-1" />
                      Start Cooking
                    </Button>
                  )}

                  {o.status === 'PREPARING' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={actionId === o.id}
                      onClick={() => handleStatusTransition(o.id, 'READY')}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Mark Packed & READY
                    </Button>
                  )}

                  {o.status === 'READY' && (
                    <Link to="/owner/deliveries">
                      <Button size="sm" variant="primary">
                        <Truck className="w-3.5 h-3.5 mr-1" />
                        Dispatch Courier →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > perPage && (
        <div className="flex justify-center items-center gap-3 pt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-400">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= Math.ceil(total / perPage)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
