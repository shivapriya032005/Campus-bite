import { useState, useEffect } from 'react';
import { RefreshCcw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const toast = useToast();

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/refunds/pending');
      setRefunds(res.data || []);
    } catch (err) {
      toast.error('Failed to load pending refund requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleAction = async (requestId, action) => {
    setActionId(requestId);
    try {
      await api.post(`/refunds/${requestId}/action`, { action });
      toast.success(
        action === 'approve'
          ? 'Refund approved and credited to customer ledger'
          : 'Refund request rejected'
      );
      fetchRefunds();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Action failed'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1 border-b border-gray-800 pb-5">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Financial Disputes
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Customer Refund Claims
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Review customer dispute claims for delivered meals and authorize double-entry ledger reimbursements.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : refunds.length === 0 ? (
        <EmptyState
          icon={RefreshCcw}
          title="No pending refund disputes"
          description="All customer claims have been adjudicated or there are no current disputes."
        />
      ) : (
        <div className="space-y-4">
          {refunds.map((req) => (
            <Card key={req.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-lg font-bold text-white">Dispute #{req.id}</span>
                  <span className="text-[11px] bg-amber-950/80 text-amber-400 border border-amber-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Filed: {new Date(req.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Associated Order:
                  </span>
                  <span className="text-white font-serif font-bold ml-2">Order #{req.order_id}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141B24] border border-gray-800 text-xs text-gray-300">
                  <strong className="text-gray-400 block mb-1">Customer Reason Statement:</strong>
                  <p className="italic leading-relaxed">"{req.reason}"</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800/80 flex flex-wrap justify-end gap-3">
                <Button
                  size="sm"
                  variant="danger"
                  loading={actionId === req.id}
                  onClick={() => handleAction(req.id, 'reject')}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject Claim
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={actionId === req.id}
                  onClick={() => handleAction(req.id, 'approve')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve & Issue Credit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
