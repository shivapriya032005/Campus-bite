import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Clock } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/my', {
        params: {
          status: statusFilter || undefined,
          page,
          per_page: perPage,
        },
      });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Your Order History</h1>
          <p className="text-gray-400 mt-1">Track active orders, reorder favorites, or request refunds</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#C5A46D]"
          >
            <option value="">All Statuses</option>
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
              ? `You don't have any orders with status "${statusFilter}"`
              : "You haven't placed any orders yet. Discover campus spots and order your first meal!"
          }
          action={
            <Link to="/restaurants">
              <button className="px-4 py-2 bg-[#C5A46D] hover:bg-[#b8954f] text-gray-900 font-semibold rounded-lg text-sm transition-colors">
                Browse Restaurants
              </button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="block">
              <Card hover className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-white">Order #{o.id}</span>
                    <Badge status={o.status}>{o.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    {o.items?.length || 0} item(s):{' '}
                    {o.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ') || 'No item details'}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-700/50">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total</span>
                    <span className="text-lg font-bold text-[#C5A46D]">
                      ${Number(o.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-750 text-gray-400 hover:text-white">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </Link>
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

