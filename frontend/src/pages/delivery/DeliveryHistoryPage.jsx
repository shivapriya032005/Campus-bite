import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A46D] block mb-1">
            Completed Trips
          </span>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            Delivery History
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Archive of your fulfilled campus deliveries and completed drop-offs
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E2633] text-xs font-semibold text-gray-300">
          Total Completed: <span className="text-[#C5A46D]">{deliveries.length}</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No Completed Deliveries Yet"
          description="Your fulfilled campus delivery runs will appear in this permanent log as you complete them."
          action={
            <Link to="/delivery/dashboard">
              <Button variant="secondary" size="sm">
                Check Active Pickups
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map((a) => (
            <Card
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#1E2633] hover:border-gray-700 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-white">Delivery #{a.id}</span>
                  <Badge status="DELIVERED">DELIVERED</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Package className="w-3.5 h-3.5 text-gray-500" />
                  <span>Order Reference: #{a.order_id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Fulfilled on: {a.delivered_at ? new Date(a.delivered_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <Link to={`/delivery/orders/${a.id}`}>
                <Button variant="secondary" size="sm">
                  View Manifest <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

