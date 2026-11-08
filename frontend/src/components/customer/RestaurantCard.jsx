import { Link } from 'react-router-dom';
import { Star, Clock, MapPin, Sparkles } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { getRestaurantImage, PLACEHOLDERS } from '../../utils/imageRegistry';

export default function RestaurantCard({ restaurant }) {
  const imageUrl = restaurant.image_url || getRestaurantImage(restaurant);
  const rating = Number(restaurant.avg_rating || 4.8).toFixed(1);
  const reviewCount = restaurant.total_reviews || 12;

  // Derive estimated delivery time based on ID for realistic campus feel
  const prepTime = 15 + ((restaurant.id * 3) % 15);
  const deliveryTime = `${prepTime}-${prepTime + 10} mins`;
  const distance = `${(0.4 + ((restaurant.id * 0.3) % 1.5)).toFixed(1)} km`;

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="group block rounded-2xl overflow-hidden bg-[#171F2C] border border-[#1E2633] hover:border-[#C5A46D]/60 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1 transition-all duration-200"
    >
      {/* Cover Image Container */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-900">
        <SafeImage
          src={imageUrl}
          alt={restaurant.name}
          fallbackSrc={PLACEHOLDERS.restaurant}
          aspectRatio="aspect-auto"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

        {/* Cuisine Tag Top Left */}
        {restaurant.cuisine_type && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#111827]/90 backdrop-blur-md text-[11px] font-semibold text-[#C5A46D] border border-[#1E2633] rounded-full shadow-md">
            {restaurant.cuisine_type.split('&')[0]}
          </span>
        )}

        {/* Promotional Tag Bottom Left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] font-bold text-white uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#C5A46D]" />
          <span>Campus Favorite</span>
        </div>

        {/* Rating Pill Bottom Right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#248A62] text-white px-2 py-0.5 rounded-lg text-xs font-bold shadow-md">
          <Star className="w-3 h-3 fill-current" />
          <span>{rating}</span>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-white tracking-tight group-hover:text-[#C5A46D] transition-colors truncate">
            {restaurant.name}
          </h3>
        </div>

        {/* Timing and Distance metadata */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
          <Clock className="w-3.5 h-3.5 text-[#C5A46D]" />
          <span>{deliveryTime}</span>
          <span className="text-gray-600">•</span>
          <span>{distance} away</span>
        </div>

        {/* Cuisine text */}
        <p className="text-xs text-gray-400 truncate">
          {restaurant.cuisine_type || 'Artisanal campus dining'}
        </p>

        {/* Address & Status */}
        <div className="pt-2.5 border-t border-[#1E2633] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="truncate">{restaurant.address || 'Campus Hub'}</span>
          </div>
          <span className="shrink-0 text-[11px] text-[#248A62] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#248A62] animate-pulse" />
            Open
          </span>
        </div>
      </div>
    </Link>
  );
}
