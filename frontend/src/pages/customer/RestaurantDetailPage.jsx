import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Phone,
  Search,
  Plus,
  Utensils,
  ArrowLeft,
  Check,
  ShoppingBag,
  Info,
} from 'lucide-react';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItemIds, setAddedItemIds] = useState(new Set());

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
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item) => {
    if (!item.is_available) {
      toast.warning('This item is currently sold out');
      return;
    }
    const added = cart.addItem(item, restaurant);
    if (added) {
      toast.success(`Added ${item.name} to cart`);
      setAddedItemIds((prev) => new Set(prev).add(item.id));
      setTimeout(() => {
        setAddedItemIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 1200);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back Link */}
      <Link
        to="/restaurants"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all campus restaurants
      </Link>

      {/* Restaurant Hero Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#171F2C] border border-gray-800 shadow-xl shadow-black/40">
        <div className="h-64 sm:h-80 w-full relative overflow-hidden bg-gray-900">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1A222E]">
              <Utensils className="w-16 h-16 text-gray-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-transparent" />

          {/* Banner content */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              {restaurant.cuisine_type && (
                <span className="inline-block px-3 py-1 bg-[#C5A46D]/20 text-[#C5A46D] border border-[#C5A46D]/40 text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
                  {restaurant.cuisine_type}
                </span>
              )}
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {restaurant.description || 'Artisanal dishes prepared daily for the campus community.'}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#171F2C]/90 backdrop-blur-md border border-gray-750 px-4 py-2 rounded-xl text-sm font-bold text-[#C5A46D]">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-base">{Number(restaurant.avg_rating || 0).toFixed(1)}</span>
                <span className="text-xs text-gray-400 font-normal">
                  ({restaurant.total_reviews} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="px-6 py-4 bg-[#141B24] border-t border-gray-800 flex flex-wrap items-center gap-6 text-xs text-gray-400">
          {restaurant.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0" />
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#C5A46D] shrink-0" />
              <span>{restaurant.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Accepting Orders Now</span>
          </div>
        </div>
      </div>

      {/* Menu Filter and Search Navigation */}
      <div className="sticky top-20 z-30 p-4 rounded-xl bg-[#171F2C]/95 backdrop-blur-md border border-gray-800 space-y-3 shadow-lg shadow-black/30">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes on this menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-gray-400 outline-none transition-all"
            />
          </div>

          <div className="text-xs text-gray-400 shrink-0">
            Showing <strong className="text-white">{filteredItems.length}</strong> items
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
                    : 'bg-[#1A222E] text-gray-300 border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items Grid */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-white tracking-tight">Available Dishes</h2>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No dishes found"
            description="No items match your active search or category filter on this menu."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
              >
                Clear Search
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const justAdded = addedItemIds.has(item.id);
              return (
                <Card
                  key={item.id}
                  className="flex flex-col justify-between overflow-hidden !p-0 group"
                >
                  <div>
                    {item.image_url ? (
                      <div className="h-44 bg-gray-800 overflow-hidden relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {!item.is_available && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <span className="px-3 py-1 bg-red-950 text-red-300 border border-red-800 rounded-full text-xs font-bold uppercase tracking-wider">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 bg-[#1A222E] flex items-center justify-center text-gray-700 border-b border-gray-800">
                        <Utensils className="w-8 h-8" />
                      </div>
                    )}

                    <div className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-base font-bold text-white tracking-tight group-hover:text-[#C5A46D] transition-colors">
                          {item.name}
                        </h3>
                        <span className="font-bold text-[#C5A46D] text-base shrink-0">
                          ${Number(item.price).toFixed(2)}
                        </span>
                      </div>

                      {item.category && (
                        <span className="inline-block text-[11px] font-medium text-gray-400 bg-[#1A222E] px-2.5 py-0.5 rounded-full border border-gray-800">
                          {item.category}
                        </span>
                      )}

                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {item.description || 'Prepared fresh with quality ingredients.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          item.is_available ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {item.is_available ? 'In Stock' : 'Unavailable'}
                      </span>

                      <Button
                        size="sm"
                        variant={justAdded ? 'secondary' : 'primary'}
                        disabled={!item.is_available}
                        onClick={() => handleAddToCart(item)}
                        className="transition-all"
                      >
                        {justAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className="pt-8 border-t border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
              Customer Reviews ({reviews.length})
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-[#C5A46D] font-bold">
              <Star className="w-4 h-4 fill-current" />
              <span>{Number(restaurant.avg_rating || 0).toFixed(1)} / 5.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <Card key={rev.id} className="space-y-3 bg-[#151D28]">
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
    </div>
  );
}
