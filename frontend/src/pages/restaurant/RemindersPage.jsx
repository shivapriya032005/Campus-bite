import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState('active'); // 'active' | 'all' (history)
  const [dismissingId, setDismissingId] = useState(null);

  const toast = useToast();

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reminders', { params: { status: view } });
      setReminders(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load reminders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [view]);

  const handleDismiss = async (id) => {
    setDismissingId(id);
    try {
      await api.post(`/reminders/${id}/dismiss`);
      toast.success('Reminder dismissed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to dismiss reminder'));
    } finally {
      setDismissingId(null);
      fetchReminders();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/reminders/generate');
      const count = res.data?.length || 0;
      toast.success(
        count > 0
          ? `Generated ${count} pending reminder(s)`
          : 'Kitchen pipeline healthy! No stale orders found.'
      );
      fetchReminders();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to trigger reminder check'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A46D] block mb-1">
            Kitchen Operations Monitor
          </span>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            Pending Order Reminders
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Automated alerts for orders lingering in PLACED or ACCEPTED status for &gt;15 minutes
          </p>
        </div>

        <Button variant="primary" loading={generating} onClick={handleGenerate}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Check Stale Orders Now
        </Button>
      </div>

      {/* Info Callout Banner */}
      <Card className="border border-[#1E2633] bg-[#111827]/70 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-[#C5A46D] shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300 space-y-1">
          <p className="font-semibold text-white">How the Background Reminder System Works</p>
          <p className="text-gray-400 leading-relaxed">
            The platform background scheduler automatically audits all active kitchen tickets every 5 minutes. Any order that remains untouched for over 15 minutes is logged below to ensure hungry campus diners are never forgotten.
          </p>
        </div>
      </Card>

      {/* Active / history switch */}
      <div className="flex items-center gap-1.5">
        {[
          { value: 'active', label: 'Active alerts' },
          { value: 'all', label: 'History' },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setView(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              view === t.value
                ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                : 'bg-[#171F2C] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {loading ? (
        <LoadingSpinner />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Kitchen Pipeline Healthy"
          description="There are currently no stale orders needing kitchen attention. All orders are progressing through preparation smoothly."
          action={
            <Link to="/owner/orders">
              <Button variant="secondary" size="sm">
                Go to Order Pipeline <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {view === 'active' ? 'Active Alerts' : 'All Reminders'} ({reminders.length})
            </span>
            <span className="text-xs text-gray-500">Most recent first</span>
          </div>

          {reminders.map((rem) => (
            <Card
              key={rem.id}
              className="border-l-4 border-l-amber-500 hover:border-l-amber-400 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Order #{rem.order_id}</h3>
                      {rem.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 uppercase">
                          Action Required
                        </span>
                      ) : (
                        <Badge status={rem.status} dot={false} />
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">{rem.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{new Date(rem.created_at).toLocaleTimeString()}</span>
                  </div>

                  <Link to="/owner/orders">
                    <Button variant="secondary" size="sm">
                      View Order <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                  {rem.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={dismissingId === rem.id}
                      onClick={() => handleDismiss(rem.id)}
                      aria-label={`Dismiss reminder for order ${rem.order_id}`}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

