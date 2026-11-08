import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function DeliveryHistoryPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/deliveries/my', { params: { status: 'DELIVERED' } });
        setDeliveries(res.data || []);
      } catch (err) {
        console.error('Failed to fetch delivery history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link
        to="/delivery/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courier Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Delivery History</h1>
        <p className="text-gray-400 mt-1">Archive of your completed campus deliveries</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No completed deliveries yet"
          description="Your fulfilled campus delivery runs will appear in this log."
        />
      ) : (
        <div className="space-y-4">
          {deliveries.map((a) => (
            <Card key={a.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-white">Delivery #{a.id}</span>
                  <Badge status="DELIVERED">DELIVERED</Badge>
                </div>
                <p className="text-xs text-gray-400">Order Reference: #{a.order_id}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Delivered on: {a.delivered_at ? new Date(a.delivered_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <Link
                to={`/delivery/orders/${a.id}`}
                className="text-xs font-semibold text-[#C5A46D] hover:underline"
              >
                View Manifest & Details →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

