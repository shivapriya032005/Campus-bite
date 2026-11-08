import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  MapPin,
  FileText,
  ShieldCheck,
  Store,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

export default function CartPage() {
  const { items, restaurantId, restaurantName, total, updateQuantity, removeItem, clearCart } =
    useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a campus delivery location or dorm room');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
        })),
        delivery_address: deliveryAddress.trim(),
        special_instructions: instructions.trim() || null,
      };

      const res = await api.post('/orders', payload);
      toast.success('Order placed successfully! Kitchen notified.');
      clearCart();
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to place order';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your campus cart is empty"
        description="Explore fresh meals, specialty brews, and gourmet snacks from top university eateries."
        action={
          <Link to="/restaurants">
            <Button variant="primary" size="md">
              Discover Restaurants
            </Button>
          </Link>
        }
      />
    );
  }

  const subtotal = total;
  const deliveryFee = 0.0;
  const estimatedTax = total * 0.05; // 5% campus municipal tax
  const grandTotal = subtotal + deliveryFee + estimatedTax;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Review & Checkout
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Your Campus Basket
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Ordering fresh from{' '}
          <Link to={`/restaurants/${restaurantId}`} className="text-[#C5A46D] font-bold hover:underline">
            {restaurantName}
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Items List & Delivery Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Items Card */}
          <Card noPadding className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#141B24] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Order Items ({items.reduce((s, i) => s + i.quantity, 0)})
              </span>
              <button
                onClick={clearCart}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            </div>

            <div className="divide-y divide-gray-800/80">
              {items.map((item) => (
                <div key={item.menu_item_id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-sm sm:text-base font-bold text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#C5A46D] font-medium mt-0.5">
                      ${Number(item.price).toFixed(2)} each
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-[#1A222E] border border-gray-750 rounded-lg p-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-750 transition-colors cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-750 transition-colors cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[70px] shrink-0">
                    <span className="font-bold text-white text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.menu_item_id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Delivery Details Card */}
          <Card className="space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C5A46D]" />
              Campus Delivery Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  Campus Location / Dorm Room *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. North Hall C, Room 314 or Science Library Study Room 4B"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C5A46D]" />
                  Kitchen & Courier Instructions (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. No plastic cutlery, ring bell twice, allergy notes..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Financial Summary & Authorize */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="space-y-5">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-3">
              Payment & Summary
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Items Subtotal</span>
                <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Campus Courier Delivery</span>
                <span className="text-emerald-400 font-semibold">Free (Campus Standard)</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Estimated Local Tax (5%)</span>
                <span className="text-white font-medium">${estimatedTax.toFixed(2)}</span>
              </div>

              <div className="border-t border-gray-800 pt-3 flex justify-between items-baseline">
                <span className="font-serif text-base font-bold text-white">Grand Total</span>
                <span className="font-serif text-2xl font-bold text-[#C5A46D]">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Mock Payment Ledger Card */}
            <div className="p-3.5 rounded-xl bg-[#141B24] border border-gray-800 space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CreditCard className="w-4 h-4 text-[#C5A46D]" />
                <span>Double-Entry Mock Campus Ledger</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                No real credit card required. Upon checkout, an instant authorized payment entry will be created in your account ledger.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onClick={handleCheckout}
              className="rounded-xl shadow-lg shadow-[#C5A46D]/20 font-bold"
            >
              Authorize Order & Pay <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#248A62]" />
              <span>Full refund guarantee if meal cannot be fulfilled</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
