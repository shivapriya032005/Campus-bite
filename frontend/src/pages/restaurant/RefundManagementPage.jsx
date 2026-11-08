import { useState, useEffect } from 'react';
import { RefreshCcw, CheckCircle, XCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import api from '../../api/client';
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
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Refund & Return Claims</h1>
        <p className="text-gray-400 mt-1">
          Review customer disputes for delivered meals and authorize reimbursement
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : refunds.length === 0 ? (
        <EmptyState
          icon={RefreshCcw}
          title="No pending refund claims"
          description="All customer requests have been processed or there are no current disputes."
        />
      ) : (
        <div className="space-y-4">
          {refunds.map((req) => (
            <Card key={req.id} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-750 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">Claim #{req.id}</span>
                  <span className="text-xs bg-yellow-950/80 text-yellow-400 border border-yellow-800 font-bold px-2 py-0.5 rounded uppercase">
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Filed on {new Date(req.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">
                    Associated Order:
                  </span>
                  <span className="text-white font-bold ml-2">Order #{req.order_id}</span>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg border border-gray-750 text-gray-300 text-xs">
                  <strong className="text-gray-400 block mb-1">Customer Reason:</strong>
                  <p className="italic">{req.reason}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-750 flex justify-end gap-3">
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
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Approve & Issue Refund
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

