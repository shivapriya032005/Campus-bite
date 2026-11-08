import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Phone, Search, Plus, Utensils, ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

  const categories = Array.from(
    new Set(menuItems.map((i) => i.category).filter(Boolean))
  );

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesMin = !minPrice || Number(item.price) >= Number(minPrice);
    const matchesMax = !maxPrice || Number(item.price) <= Number(maxPrice);
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesMin && matchesMax && matchesCategory;
  });

  const handleAddToCart = (item) => {
    if (!item.is_available) {
      toast.warning('This item is currently unavailable');
      return;
    }
    const added = cart.addItem(item, restaurant);
    if (added) {
      toast.success(`Added ${item.name} to cart`);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!restaurant) {
    return (
      <EmptyState
        icon={Utensils}
        title="Restaurant not found"
        description="The requested restaurant does not exist or has been deactivated."
      />
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/restaurants"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to restaurants
      </Link>

      {/* Restaurant Header Banner */}
      <Card noPadding className="overflow-hidden">
        <div className="h-56 bg-gray-800 relative">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
              <Utensils className="w-16 h-16 text-gray-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {restaurant.cuisine_type && (
                  <span className="px-2.5 py-0.5 bg-[#C5A46D]/20 text-[#C5A46D] border border-[#C5A46D]/40 text-xs font-semibold rounded-full">
                    {restaurant.cuisine_type}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-sm text-gray-300 max-w-2xl mt-1">{restaurant.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-sm border border-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold text-[#C5A46D]">
                <Star className="w-4 h-4 fill-current" />
                <span>{Number(restaurant.avg_rating || 0).toFixed(1)}</span>
                <span className="text-gray-400 font-normal">({restaurant.total_reviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-850 flex flex-wrap gap-6 text-xs text-gray-400 border-t border-gray-700/50">
          {restaurant.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C5A46D]" />
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#C5A46D]" />
              <span>{restaurant.phone}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Menu Filters */}
      <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search dishes..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min $"
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              type="number"
              placeholder="Max $"
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                !selectedCategory
                  ? 'bg-[#C5A46D] text-gray-900 border-[#C5A46D] font-semibold'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
              }`}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedCategory === c
                    ? 'bg-[#C5A46D] text-gray-900 border-[#C5A46D] font-semibold'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Menu Items</h2>
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No dishes found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <Card key={item.id} className="flex flex-col justify-between">
                <div>
                  {item.image_url && (
                    <div className="h-36 bg-gray-750 rounded-lg overflow-hidden mb-3">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-white">{item.name}</h3>
                    <span className="text-[#C5A46D] font-bold text-base shrink-0">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                  {item.category && (
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-750 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    {item.description || 'Prepared fresh with quality ingredients.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-750 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      item.is_available ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {item.is_available ? 'Available' : 'Sold Out'}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!item.is_available}
                    onClick={() => handleAddToCart(item)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="pt-8 border-t border-gray-800 space-y-4">
          <h2 className="text-xl font-bold text-white">Customer Reviews ({reviews.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.slice(0, 6).map((rev) => (
              <Card key={rev.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-[#C5A46D]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-current' : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 italic">{rev.comment || 'No comment provided.'}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
