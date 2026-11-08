import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin, FileText } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

export default function CartPage() {
  const { items, restaurantId, restaurantName, total, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
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
      toast.success('Order placed successfully! Mock payment authorized.');
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
        title="Your cart is empty"
        description="Looks like you haven't added any dishes yet. Discover delicious options from campus restaurants!"
        action={
          <Link to="/restaurants">
            <Button variant="primary">Browse Restaurants</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Cart</h1>
        <p className="text-gray-400 mt-1">
          Ordering from <span className="text-[#C5A46D] font-semibold">{restaurantName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <Card noPadding>
            <div className="divide-y divide-gray-700/50">
              {items.map((item) => (
                <div key={item.menu_item_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-sm text-[#C5A46D]">${Number(item.price).toFixed(2)} each</p>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <p className="font-bold text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.menu_item_id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Delivery Details Form */}
          <Card>
            <h2 className="text-lg font-bold text-white mb-4">Delivery Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#C5A46D]" />
                  Delivery Address / Campus Location *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. West Campus Dorm Hall B, Room 402"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#C5A46D]" />
                  Special Instructions (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please leave at door, no pickles"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Campus Delivery Fee</span>
                <span className="text-green-400 font-medium">Free</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Payment Method</span>
                <span className="text-gray-300">Mock Campus Pay</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between text-lg font-bold text-white">
                <span>Total</span>
                <span className="text-[#C5A46D]">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              className="mt-6"
              loading={loading}
              onClick={handleCheckout}
            >
              Place Order <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <p className="text-[11px] text-gray-500 text-center mt-3">
              By placing your order, an instant mock payment is authorized and sent directly to the restaurant kitchen.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

