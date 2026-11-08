import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight, CheckCircle, Truck, Utensils } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

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

  const STATUSES = [
    '',
    'PLACED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Order Management</h1>
          <p className="text-gray-400 mt-1">Accept incoming orders, update kitchen status, and prepare dispatch</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-medium">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#C5A46D]"
          >
            <option value="">All Orders</option>
            {STATUSES.filter(Boolean).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders found"
          description={
            statusFilter
              ? `No orders matching status "${statusFilter}"`
              : 'Your restaurant has not received any orders yet.'
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-750 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">Order #{o.id}</span>
                  <Badge status={o.status}>{o.status.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <span className="font-bold text-[#C5A46D] text-sm">
                    ${Number(o.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items & Address Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">ITEMS ({o.items?.length || 0}):</span>
                  <ul className="space-y-1">
                    {o.items?.map((it) => (
                      <li key={it.id} className="flex justify-between">
                        <span>
                          {it.quantity}x {it.item_name}
                        </span>
                        <span className="text-gray-400">${Number(it.subtotal).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">DELIVER TO:</span>
                  <p>{o.delivery_address}</p>
                  {o.special_instructions && (
                    <p className="mt-1 text-gray-400 italic">
                      <strong>Note:</strong> {o.special_instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-gray-750 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-gray-400">
                  Current Pipeline: <strong className="text-white">{o.status}</strong>
                </div>

                <div className="flex gap-2">
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
                      Mark READY
                    </Button>
                  )}

                  {o.status === 'READY' && (
                    <Link to="/owner/deliveries">
                      <Button size="sm" variant="primary">
                        <Truck className="w-3.5 h-3.5 mr-1" />
                        Assign Courier
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
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400 px-2">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          <button
            disabled={page >= Math.ceil(total / perPage)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

