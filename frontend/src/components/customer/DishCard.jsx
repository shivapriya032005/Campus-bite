import { useState } from 'react';
import { Plus, Minus, Check, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../common/Toast';
import SafeImage from '../common/SafeImage';
import { getDishImage, PLACEHOLDERS } from '../../utils/imageRegistry';

/**
 * Swiggy/Zomato-inspired Dish Card
 * - Dietary indicator (Veg / Non-veg)
 * - Dish photo with rounded corners
 * - Floating ADD button with live quantity counter synced to CartContext
 */
export default function DishCard({ item, restaurant }) {
  const cart = useCart();
  const toast = useToast();

  const cartItem = cart?.items?.find((i) => i.menu_item_id === item.id);
  const quantity = cartItem?.quantity || 0;

  // Determine if veg or non-veg based on name/category
  const nameLower = (item.name || '').toLowerCase();
  const catLower = (item.category || '').toLowerCase();
  const isNonVeg =
    nameLower.includes('chicken') ||
    nameLower.includes('beef') ||
    nameLower.includes('angus') ||
    nameLower.includes('pepperoni') ||
    nameLower.includes('fish') ||
    nameLower.includes('pork');

  const imageUrl = item.image_url || getDishImage(item);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!item.is_available) {
      toast.warning('This dish is currently sold out');
      return;
    }
    const added = cart.addItem(item, restaurant);
    if (added) {
      toast.success(`Added ${item.name} to cart`);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    cart.updateQuantity(item.id, quantity + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    cart.updateQuantity(item.id, quantity - 1);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#171F2C] border border-[#1E2633] hover:border-gray-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
      {/* Left Details */}
      <div className="space-y-1.5 flex-1 pr-2">
        {/* Dietary symbol + Bestseller tag */}
        <div className="flex items-center gap-2">
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              isNonVeg
                ? 'border-red-500/80'
                : 'border-emerald-500/80'
            }`}
            title={isNonVeg ? 'Non-Vegetarian' : 'Vegetarian'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isNonVeg ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </span>

          {item.category && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-[#111827] px-2 py-0.5 rounded-full border border-[#1E2633]">
              {item.category}
            </span>
          )}

          {quantity > 0 && (
            <span className="text-[10px] font-bold text-[#C5A46D] bg-[#C5A46D]/15 px-2 py-0.5 rounded-full">
              In Cart ({quantity})
            </span>
          )}
        </div>

        {/* Dish Name */}
        <h4 className="font-serif text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-[#C5A46D] transition-colors">
          {item.name}
        </h4>

        {/* Price */}
        <div className="text-sm font-bold text-white font-mono">
          ${Number(item.price).toFixed(2)}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {item.description || 'Artisanal campus preparation with fresh ingredients.'}
        </p>
      </div>

      {/* Right Photo + Floating Add Counter (Swiggy Signature Pattern) */}
      <div className="relative shrink-0 self-center sm:self-auto w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-lg shadow-black/40">
        <SafeImage
          src={imageUrl}
          alt={item.name}
          fallbackSrc={PLACEHOLDERS.food}
          aspectRatio="aspect-square"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Sold out overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-md bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}

        {/* Floating ADD Button / Stepper */}
        {item.is_available && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 w-[85%]">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-gray-950 border border-[#C5A46D] rounded-xl px-2 py-1 shadow-lg text-white font-bold text-xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Remove one"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs text-[#C5A46D] font-bold px-1">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Add one more"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-[#FAF8F3] text-gray-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 flex items-center justify-center gap-1"
              >
                <span>ADD</span>
                <Plus className="w-3.5 h-3.5 text-[#248A62] font-bold" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

