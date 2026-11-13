import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Clock } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import { dateRangeParams, isInvertedRange } from '../../utils/dates';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';
import SafeImage from '../../components/common/SafeImage';
import { getDishImage } from '../../utils/imageRegistry';

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const rangeInvalid = isInvertedRange(dateFrom, dateTo);

  useEffect(() => {
    if (rangeInvalid) {
      setError('The "From" date must not be after the "To" date.');
      return undefined;
    }
    let cancelled = false; // ignore responses of superseded requests (fast filter changes)
    (async () => {
      setLoading(true);
      setError('');
      try {
        // "ACTIVE" is resolved by the server so pagination and totals stay correct.
        const params = { page, per_page: perPage, ...dateRangeParams(dateFrom, dateTo) };
        if (statusFilter) params.status = statusFilter;
        const res = await api.get('/orders/my', { params });
        if (cancelled) return;
        setOrders(res.data.orders || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load your orders.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, dateFrom, dateTo, rangeInvalid]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Account Management
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Your Order History
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Track active deliveries, inspect past item receipts, and manage review disputes.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                  : 'bg-[#171F2C] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3 text-xs text-gray-400">
        <label className="flex flex-col gap-1">
          From
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="bg-[#171F2C] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:border-[#C5A46D]"
          />
        </label>
        <label className="flex flex-col gap-1">
          To
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="bg-[#171F2C] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:border-[#C5A46D]"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-800 hover:text-white cursor-pointer"
          >
            Clear dates
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders found"
          description={
            statusFilter
              ? `You don't have any orders matching the "${statusFilter}" filter.`
              : 'You have not placed any orders yet. Discover campus eateries and enjoy fresh meals!'
          }
          action={
            <Link to="/restaurants">
              <Button variant="primary">Browse Restaurants</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const firstItem = o.items?.[0];
            const firstItemImage = firstItem ? getDishImage({ name: firstItem.item_name }) : null;
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="block group">
                <Card hover className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {firstItemImage && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-900 border border-[#1E2633]">
                        <SafeImage
                          src={firstItemImage}
                          alt={firstItem?.item_name || 'Dish'}
                          aspectRatio="aspect-square"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-lg font-bold text-white group-hover:text-[#C5A46D] transition-colors">
                          Order #{o.id}
                        </span>
                        <Badge status={o.status}>{o.status.replace(/_/g, ' ')}</Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>Placed on {new Date(o.created_at).toLocaleString()}</span>
                      </div>

                      <p className="text-xs text-gray-300">
                        <span className="text-gray-500 font-semibold mr-1">Dishes:</span>
                        {o.items?.map((it) => `${it.quantity}x ${it.item_name}`).join(', ') || 'No items listed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Total</span>
                      <span className="font-serif text-lg font-bold text-[#C5A46D]">
                        ${Number(o.total_amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#1A222E] border border-gray-750 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:border-[#C5A46D] transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
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
