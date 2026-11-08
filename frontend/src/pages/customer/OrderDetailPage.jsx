import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, AlertCircle, CheckCircle, Star, RefreshCcw, DollarSign } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

const LIFECYCLE_STEPS = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Review Modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Refund Modal state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const toast = useToast();

  const fetchOrderDetails = async () => {
    try {
      const [ordRes, payRes] = await Promise.all([
        api.get(`/orders/my/${id}`),
        api.get(`/orders/${id}/payments`).catch(() => ({ data: [] })),
      ]);
      setOrder(ordRes.data);
      setPayments(payRes.data || []);

      // Check if return request exists
      try {
        const retRes = await api.get(`/orders/${id}/return`);
        setReturnReq(retRes.data);
      } catch {
        setReturnReq(null);
      }
    } catch (err) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/orders/my/${id}/cancel`);
      setOrder(res.data);
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/orders/${id}/review`, { rating: Number(rating), comment: comment || null });
      toast.success('Thank you for your review!');
      setReviewOpen(false);
      fetchOrderDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      toast.error('Please describe the reason for your refund request');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/orders/${id}/return`, { reason: refundReason.trim() });
      setReturnReq(res.data);
      toast.success('Refund request submitted for restaurant owner review');
      setRefundOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit refund request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!order) return <div className="text-white">Order not found</div>;

  const currentStepIndex = LIFECYCLE_STEPS.indexOf(order.status);
  const isTerminal = ['CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all orders
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">Order #{order.id}</h1>
            <Badge status={order.status}>{order.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Placed on {new Date(order.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {order.status === 'PLACED' && (
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleCancel}
            >
              Cancel Order
            </Button>
          )}

          {order.status === 'DELIVERED' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReviewOpen(true)}
              >
                <Star className="w-3.5 h-3.5 mr-1" />
                Leave Review
              </Button>

              {!returnReq && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRefundOpen(true)}
                >
                  <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                  Request Refund
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Tracker */}
      {!isTerminal && (
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">
            Delivery Progress
          </h2>
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-[#C5A46D] -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, (currentStepIndex / (LIFECYCLE_STEPS.length - 1)) * 100)}%`,
              }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const completed = currentStepIndex >= idx;
              const active = currentStepIndex === idx;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#C5A46D] text-gray-900 ring-4 ring-[#C5A46D]/20 scale-110'
                        : completed
                        ? 'bg-[#C5A46D] text-gray-900'
                        : 'bg-gray-800 border border-gray-600 text-gray-500'
                    }`}
                  >
                    {completed ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-2 font-medium hidden sm:block ${
                      active
                        ? 'text-[#C5A46D]'
                        : completed
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Return Request Notification Banner if exists */}
      {returnReq && (
        <Card className="border-l-4 border-l-[#C5A46D]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#C5A46D] shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Refund Request Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    returnReq.status === 'approved'
                      ? 'bg-green-900/50 text-green-400'
                      : returnReq.status === 'rejected'
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}
                >
                  {returnReq.status}
                </span>
              </div>
              <p className="text-gray-400">
                <strong className="text-gray-300">Reason:</strong> {returnReq.reason}
              </p>
              {returnReq.resolved_at && (
                <p className="text-xs text-gray-500">
                  Resolved on: {new Date(returnReq.resolved_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Items Table */}
        <div className="md:col-span-2 space-y-4">
          <Card noPadding>
            <div className="p-4 border-b border-gray-700/50">
              <h2 className="text-base font-bold text-white">Items Ordered</h2>
            </div>
            <div className="divide-y divide-gray-700/50">
              {order.items?.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{item.item_name}</h3>
                    <p className="text-xs text-gray-400">
                      ${Number(item.unit_price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-white text-sm">
                    ${Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-850 border-t border-gray-700/50 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">Grand Total</span>
              <span className="text-lg font-bold text-[#C5A46D]">
                ${Number(order.total_amount).toFixed(2)}
              </span>
            </div>
          </Card>

          {/* Payment Ledger Entries */}
          {payments.length > 0 && (
            <Card>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#C5A46D]" />
                Payment Ledger
              </h2>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded bg-gray-900 border border-gray-750 text-xs"
                  >
                    <div>
                      <span className="font-mono text-gray-300 uppercase font-semibold">
                        {p.entry_type}
                      </span>
                      <span className="text-gray-500 ml-2">Ref: {p.reference_id}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          p.entry_type === 'refund' ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {p.entry_type === 'refund' ? '-' : '+'}${Number(p.amount).toFixed(2)}
                      </span>
                      <span className="text-gray-500 ml-2 uppercase text-[10px]">
                        ({p.status})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
              Delivery Destination
            </h2>
            <div className="flex items-start gap-2 text-sm text-gray-300">
              <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
              <span>{order.delivery_address}</span>
            </div>

            {order.special_instructions && (
              <div className="mt-4 pt-3 border-t border-gray-750">
                <span className="text-xs text-gray-500 block mb-1">Instructions:</span>
                <p className="text-xs text-gray-300 italic">{order.special_instructions}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      <Modal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Submit Order Review">
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-[#C5A46D] hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${star <= rating ? 'fill-current' : 'text-gray-600'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Comments (optional)
            </label>
            <textarea
              rows={3}
              placeholder="How was the food quality and delivery service?"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>

      {/* Refund Request Modal */}
      <Modal
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Request Order Return / Refund"
      >
        <form onSubmit={handleRefundSubmit} className="space-y-4">
          <p className="text-xs text-gray-400">
            Submit a refund request for Order #{order.id}. If approved by the restaurant owner,
            the full amount (${Number(order.total_amount).toFixed(2)}) will be credited to your
            ledger.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Reason for Refund *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe what was wrong (e.g. wrong item received, cold food, quality issue)..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={actionLoading}>
              Submit Refund Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

