import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin, FileText, ShieldCheck, Store, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api, { getErrorMessage } from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import LocationModal from '../../components/customer/LocationModal';
import { getDishImage, PLACEHOLDERS } from '../../utils/imageRegistry';

export default function CartPage() {
  const { items, restaurantId, restaurantName, total, updateQuantity, removeItem, clearCart } =
    useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(
    () => localStorage.getItem('campusbite_location') || user?.address || 'North Quad Dorm, Hall C, Room 314'
  );
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('campus_card'); // 'campus_card' | 'apple_pay' | 'credit_card'
  const [loading, setLoading] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      toast.error('Please specify a campus delivery location or dorm room');
      return;
    }
    if (items.length === 0) {
      toast.error('Your basket is empty');
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
      toast.success('Order placed successfully! Kitchen has been notified.');
      clearCart();
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to place order');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your campus food basket is empty"
        description="Explore fresh meals, specialty brews, and authentic culinary dishes from top university dining kitchens."
        action={
          <Link to="/restaurants">
            <Button variant="primary" size="md">
              Discover Campus Eateries
            </Button>
          </Link>
        }
      />
    );
  }

  const subtotal = total;
  const deliveryFee = 0.0; // Free dorm delivery promo
  const taxesAndFees = subtotal * 0.05; // 5% campus municipal dining fee
  const grandTotal = subtotal + deliveryFee + taxesAndFees;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Review & Checkout
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Your Campus Basket
        </h1>
        <p className="text-sm text-gray-400">
          Review your items, select drop-off instructions, and confirm your meal order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Items List & Delivery Address (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Restaurant Header Banner */}
          <div className="p-4 rounded-2xl bg-[#171F2C] border border-[#1E2633] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C5A46D]/15 border border-[#C5A46D]/30 flex items-center justify-center text-[#C5A46D]">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Kitchen
                </span>
                <h3 className="text-sm font-bold text-white">{restaurantName}</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline cursor-pointer"
            >
              Clear Basket
            </button>
          </div>

          {/* Dishes in Cart (with Thumbnails) */}
          <Card noPadding className="divide-y divide-[#1E2633] border border-[#1E2633] overflow-hidden">
            {items.map((item) => {
              const imageSrc = item.image_url || getDishImage(item);
              const nameLower = (item.name || '').toLowerCase();
              const isNonVeg =
                nameLower.includes('chicken') ||
                nameLower.includes('beef') ||
                nameLower.includes('angus') ||
                nameLower.includes('pepperoni');

              return (
                <div key={item.menu_item_id} className="p-4 flex items-center gap-4">
                  {/* Dish Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-900 border border-[#1E2633]">
                    <SafeImage
                      src={imageSrc}
                      alt={item.name}
                      fallbackSrc={PLACEHOLDERS.food}
                      aspectRatio="aspect-square"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Price */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isNonVeg ? 'border-red-500' : 'border-emerald-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isNonVeg ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        />
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    </div>

                    <p className="text-xs text-[#C5A46D] font-mono font-bold">
                      ${Number(item.price).toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-[#111827] border border-[#1E2633] rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.menu_item_id)}
                      className="text-gray-500 hover:text-red-400 p-1.5 transition-colors"
                      title="Remove from basket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Delivery Location & Special Instructions */}
          <Card className="space-y-4 border border-[#1E2633]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A46D]" />
                <h3 className="text-sm font-bold text-white">Delivery Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="text-xs text-[#C5A46D] hover:underline font-semibold cursor-pointer"
              >
                Change Location
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#111827] border border-[#1E2633] text-xs text-white">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">
                Drop-off Destination
              </span>
              <p className="font-medium">{deliveryAddress}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Special Instructions for Kitchen & Courier (optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Leave at dorm lobby reception desk, ring doorbell upon drop-off..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-[#111827] border border-[#1E2633] focus:border-[#C5A46D] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none resize-none"
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Financial Summary & Payment (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-[#1E2633] space-y-5">
            <h3 className="font-serif text-lg font-bold text-white border-b border-[#1E2633] pb-3">
              Bill Breakdown
            </h3>

            {/* Price list */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Item Total</span>
                <span className="font-mono text-white font-medium">
                  ${Number(subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-gray-300">
                <span className="flex items-center gap-1">
                  <span>Dorm Courier Delivery</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#248A62]/20 text-[#248A62] font-bold">
                    FREE
                  </span>
                </span>
                <span className="font-mono text-emerald-400 font-medium">$0.00</span>
              </div>

              <div className="flex justify-between text-gray-300">
                <span>Campus Dining Tax & Service (5%)</span>
                <span className="font-mono text-white font-medium">
                  ${Number(taxesAndFees).toFixed(2)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#1E2633] flex justify-between items-baseline text-sm">
                <span className="font-bold text-white text-base">To Pay</span>
                <span className="font-mono text-xl font-bold text-[#C5A46D]">
                  ${Number(grandTotal).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-[#1E2633] space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                Payment Option
              </span>

              <div className="space-y-2">
                {[
                  {
                    id: 'campus_card',
                    name: 'Campus Dining Card / Meal Plan',
                    desc: 'Instant student meal allowance debit',
                  },
                  {
                    id: 'apple_pay',
                    name: 'Apple Pay / Digital Wallet',
                    desc: 'One-touch secure student payment',
                  },
                  {
                    id: 'credit_card',
                    name: 'Credit / Debit Card (Sandbox)',
                    desc: 'Mock double-entry ledger settlement',
                  },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      paymentMethod === pm.id
                        ? 'border-[#C5A46D] bg-[#C5A46D]/10 ring-1 ring-[#C5A46D]/30'
                        : 'border-[#1E2633] bg-[#111827] hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-bold ${paymentMethod === pm.id ? 'text-white' : 'text-gray-300'}`}>
                        {pm.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pm.desc}</p>
                    </div>
                    {paymentMethod === pm.id && (
                      <CheckCircle2 className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkout Action Button */}
            <Button
              type="button"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              onClick={handleCheckout}
              className="mt-2 font-bold text-sm tracking-wide"
            >
              Place Campus Order · ${Number(grandTotal).toFixed(2)}{' '}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Security Guarantee */}
            <div className="flex items-center justify-center gap-1.5 text-gray-400 text-[11px] pt-1">
              <ShieldCheck className="w-4 h-4 text-[#248A62]" />
              <span>Double-entry ledger & safe campus delivery</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={deliveryAddress}
        onSelectLocation={(newLoc) => {
          setDeliveryAddress(newLoc);
          localStorage.setItem('campusbite_location', newLoc);
        }}
      />
    </div>
  );
}
