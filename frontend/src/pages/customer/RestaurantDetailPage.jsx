import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Phone, Search, ArrowLeft, Clock, Utensils, Leaf, ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DishCard from '../../components/customer/DishCard';
import SafeImage from '../../components/common/SafeImage';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { getRestaurantImage, PLACEHOLDERS } from '../../utils/imageRegistry';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);

  const cart = useCart();
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rRes, mRes, revRes] = await Promise.all([
          api.get(`/restaurants/${id}`),
          api.get(`/menu-items/restaurant/${id}`),
          api.get(`/restaurants/${id}/reviews`).catch(() => ({ data: [] })),
        ]);
        setRestaurant(rRes.data);
        setMenuItems(mRes.data.items || []);
        setReviews(revRes.data || []);
      } catch (err) {
        toast.error('Failed to load restaurant details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const categories = ['All', ...Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean)))];

  const filteredItems = menuItems.filter((item) => {
    // Search filter
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    // Veg filter
    if (vegOnly) {
      const nameLower = (item.name || '').toLowerCase();
      const isNonVeg =
        nameLower.includes('chicken') ||
        nameLower.includes('beef') ||
        nameLower.includes('angus') ||
        nameLower.includes('pepperoni') ||
        nameLower.includes('fish') ||
        nameLower.includes('pork');
      if (isNonVeg) return false;
    }

    return matchesSearch && matchesCategory;
  });

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const cartTotal = cart?.total || 0;
  const isCartFromThisRestaurant = cart?.restaurantId === Number(id);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <EmptyState
        icon={Utensils}
        title="Restaurant not found"
        description="The requested eatery could not be located or has been deactivated."
        action={
          <Link to="/restaurants">
            <Button variant="primary">Back to Restaurants</Button>
          </Link>
        }
      />
    );
  }

  const imageUrl = restaurant.image_url || getRestaurantImage(restaurant);
  const rating = Number(restaurant.avg_rating || 4.8).toFixed(1);
  const prepTime = 15 + ((restaurant.id * 3) % 15);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Back Link */}
      <Link
        to="/restaurants"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all campus restaurants
      </Link>

      {/* Hero Restaurant Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#171F2C] border border-[#1E2633] shadow-2xl shadow-black/40">
        <div className="h-64 sm:h-80 w-full relative overflow-hidden bg-gray-950">
          <SafeImage
            src={imageUrl}
            alt={restaurant.name}
            fallbackSrc={PLACEHOLDERS.restaurant}
            aspectRatio="aspect-auto"
            className="w-full h-full object-cover"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-transparent to-transparent" />

          {/* Banner content */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10">
            <div className="space-y-2 max-w-2xl">
              {restaurant.cuisine_type && (
                <span className="inline-block px-3 py-1 bg-[#C5A46D]/20 text-[#C5A46D] border border-[#C5A46D]/40 text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-md">
                  {restaurant.cuisine_type}
                </span>
              )}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
                {restaurant.description || 'Artisanal dishes prepared daily for the campus community.'}
              </p>
            </div>

            {/* Quick KPI badges */}
            <div className="shrink-0 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#248A62] text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-lg">
                <Star className="w-4 h-4 fill-current" />
                <span>{rating}</span>
                <span className="text-xs font-normal opacity-80">
                  ({restaurant.total_reviews} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="px-6 py-3.5 bg-[#141B24] border-t border-[#1E2633] flex flex-wrap items-center gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <Clock className="w-4 h-4 text-[#C5A46D]" />
            <span>{prepTime}-{prepTime + 10} mins delivery time</span>
          </div>
          {restaurant.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{restaurant.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[#248A62] font-semibold ml-auto">
            <span className="w-2 h-2 rounded-full bg-[#248A62] animate-pulse" />
            <span>Open & Taking Orders</span>
          </div>
        </div>
      </div>

      {/* Sticky Menu Filter & Search Bar */}
      <div className="sticky top-20 z-30 p-4 rounded-2xl bg-[#171F2C]/95 backdrop-blur-md border border-[#1E2633] space-y-3 shadow-xl shadow-black/30">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes inside this menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111827] border border-[#1E2633] focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D]/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
            />
          </div>

          {/* Pure Veg Toggle Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                vegOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-[#111827] text-gray-400 border-[#1E2633] hover:text-white'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Veg Only</span>
            </button>

            <span className="text-xs text-gray-400">
              <strong className="text-white">{filteredItems.length}</strong> items
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                    : 'bg-[#111827] text-gray-400 border-[#1E2633] hover:border-gray-700 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Dishes List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
            Menu Dishes
          </h2>
          {selectedCategory !== 'All' && (
            <span className="text-xs text-[#C5A46D] font-semibold">
              Category: {selectedCategory}
            </span>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No dishes found"
            description="No items match your active search or filters on this menu."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setVegOnly(false);
                }}
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <DishCard key={item.id} item={item} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className="pt-8 border-t border-[#1E2633] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
              Customer Reviews ({reviews.length})
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-[#C5A46D] font-bold">
              <Star className="w-4 h-4 fill-current" />
              <span>{rating} / 5.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <Card key={rev.id} className="space-y-3 bg-[#171F2C] border border-[#1E2633]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#C5A46D]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-current' : 'text-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed">
                  "{rev.comment || 'Great meal and fast delivery!'}"
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Floating Bottom Cart Bar (Swiggy / Uber Eats Pattern) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-gray-950 via-[#171F2C] to-gray-950 border border-[#C5A46D] shadow-2xl shadow-black/80 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-xl bg-[#C5A46D] text-gray-950 flex items-center justify-center font-bold text-xs">
                {cartCount}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {cartCount} {cartCount === 1 ? 'dish' : 'dishes'} in your basket
                </p>
                <p className="text-[11px] text-gray-400">
                  Total: <strong className="text-white font-mono">${Number(cartTotal).toFixed(2)}</strong>
                </p>
              </div>
            </div>

            <Link to="/cart">
              <button
                type="button"
                className="px-5 py-2 rounded-xl bg-[#C5A46D] hover:bg-[#b5935b] text-gray-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>View Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
