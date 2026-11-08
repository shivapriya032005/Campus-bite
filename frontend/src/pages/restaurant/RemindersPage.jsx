import { useState, useEffect } from 'react';
import { Bell, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const toast = useToast();

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reminders');
      setReminders(res.data || []);
    } catch (err) {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/reminders/generate');
      const count = res.data?.length || 0;
      toast.success(
        count > 0
          ? `Found and generated ${count} order reminder(s)`
          : 'Kitchen pipeline healthy! No stale orders found.'
      );
      fetchReminders();
    } catch (err) {
      toast.error('Failed to trigger reminder check');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pending Order Reminders</h1>
          <p className="text-gray-400 mt-1">
            Automated notifications for orders remaining in PLACED or ACCEPTED status for &gt;15 minutes
          </p>
        </div>

        <Button variant="primary" loading={generating} onClick={handleGenerate}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Check Stale Orders Now
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No pending reminders"
          description="Your kitchen operations are running smoothly! Orders are being processed without delays."
        />
      ) : (
        <div className="space-y-3">
          {reminders.map((rem) => (
            <Card key={rem.id} className="border-l-4 border-l-amber-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Order #{rem.order_id}</h3>
                    <p className="text-xs text-gray-300 mt-1">{rem.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(rem.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
