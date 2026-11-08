import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Utensils,
  Flame,
  Award,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import SafeImage from '../components/common/SafeImage';
import RestaurantCard from '../components/customer/RestaurantCard';
import DishCard from '../components/customer/DishCard';
import CategoryScroller from '../components/customer/CategoryScroller';
import PromoCarousel from '../components/customer/PromoCarousel';
import { PLACEHOLDERS } from '../utils/imageRegistry';

export default function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [popularDishes, setPopularDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dishesLoading, setDishesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState('checking');

  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // Health check
    api
      .get('/health')
      .then(() => setHealth('connected'))
      .catch(() => setHealth('unavailable'));

    // Fetch featured restaurants
    api
      .get('/restaurants', { params: { per_page: 8 } })
      .then(async (res) => {
        const rests = res.data.restaurants || [];
        setRestaurants(rests);

        // Fetch sample dishes from the first 3 restaurants for the popular dishes shelf
        if (rests.length > 0) {
          try {
            const dishPromises = rests.slice(0, 4).map((r) =>
              api
                .get(`/menu-items/restaurant/${r.id}`)
                .then((mRes) =>
                  (mRes.data.items || []).map((dish) => ({
                    ...dish,
                    restaurant: r,
                  }))
                )
                .catch(() => [])
            );
            const results = await Promise.all(dishPromises);
            const combined = results.flat();
            setPopularDishes(combined.slice(0, 6));
          } catch (e) {
            console.error('Failed to load sample dishes', e);
          } finally {
            setDishesLoading(false);
          }
        }
      })
      .catch((err) => console.error('Failed to load restaurants', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/restaurants');
    }
  };

  return (
    <div className="space-y-14 sm:space-y-16 pb-16">
      {/* 1. Rich Food-First Hero Section with Visual Image Composition */}
      <section className="relative rounded-3xl overflow-hidden bg-[#171F2C] border border-[#1E2633] shadow-2xl shadow-black/40">
        <div className="relative min-h-[460px] sm:min-h-[500px] flex items-center">
          {/* Background Rich Food Photography */}
          <div className="absolute inset-0">
            <SafeImage
              src="/assets/banners/banner-campus-favs.jpg"
              alt="Campus Gastronomy"
              fallbackSrc={PLACEHOLDERS.restaurant}
              aspectRatio="aspect-auto"
              className="w-full h-full object-cover object-center filter brightness-90"
            />
            {/* Dark Editorial Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-gray-950/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/30" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-3xl px-6 sm:px-12 py-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111827]/80 backdrop-blur-md border border-[#C5A46D]/40 text-[#C5A46D] text-xs font-bold tracking-wide shadow-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Food Discovery · 15-Min Dorm Delivery</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              Craving something <br />
              <span className="italic font-normal text-[#C5A46D]">delicious on campus?</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 max-w-xl font-sans leading-relaxed">
              Order fresh wood-fired pizzas, authentic dum biryanis, gourmet smash burgers, and energizing cold brews delivered straight to your dorm or study hall.
            </p>

            {/* Hero Search Bar */}
            <div className="max-w-xl">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-[#111827]/90 backdrop-blur-md border border-gray-700 hover:border-[#C5A46D] focus-within:border-[#C5A46D] focus-within:ring-2 focus-within:ring-[#C5A46D]/30 rounded-2xl p-1.5 shadow-2xl transition-all"
              >
                <div className="pl-3.5 pr-2 text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search for restaurants, biryani, burgers, pasta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="rounded-xl shrink-0 font-bold"
                >
                  Find Food
                </Button>
              </form>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-300">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C5A46D]" />
                <span>Live Milestone Tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-400" />
                <span>Student Pricing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C5A46D]" />
                <span>Verified Kitchens</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Swiggy-Level Horizontally Scrollable Category Section with Circular Photos */}
      <section>
        <CategoryScroller />
      </section>

      {/* 3. Promotional Campaign Banner Carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A46D] block mb-0.5">
              Special Campus Perks
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Deals & Highlights
            </h2>
          </div>
        </div>

        <PromoCarousel />
      </section>

      {/* 4. Popular Dishes Shelf (What's Trending Now) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[#1E2633] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D] uppercase tracking-wider mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Popular Right Now
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Trending Campus Dishes
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Most-ordered student favorites crafted fresh and ready for fast delivery
            </p>
          </div>
          <Link
            to="/restaurants"
            className="text-xs sm:text-sm font-semibold text-[#C5A46D] hover:underline flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {dishesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-32 flex items-center gap-4">
                <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : popularDishes.length === 0 ? (
          <Card className="text-center py-8">
            <Utensils className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading campus menu items...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularDishes.map((dish) => (
              <DishCard key={dish.id} item={dish} restaurant={dish.restaurant} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Featured Campus Restaurants Grid */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[#1E2633] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D] uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5" /> High Campus Ratings
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Top Rated Campus Eateries
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Verified dining spots with chef-driven culinary standards
            </p>
          </div>
          <Link
            to="/restaurants"
            className="text-xs sm:text-sm font-semibold text-[#C5A46D] hover:underline flex items-center gap-1"
          >
            <span>Browse All ({restaurants.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurants.map((rest) => (
              <RestaurantCard key={rest.id} restaurant={rest} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Why CampusBite Experience Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#171F2C] to-[#111827] border border-[#1E2633] shadow-xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Tailored For University Life
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
            Designed for Campus Convenience
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Never walk in the rain or skip meals during exam weeks again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E2633] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A46D]/15 border border-[#C5A46D]/30 flex items-center justify-center text-[#C5A46D]">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">15-Minute Dorm Delivery</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Student couriers stationed across campus quads pick up directly from kitchens for lightning-fast arrival.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E2633] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#248A62]/15 border border-[#248A62]/30 flex items-center justify-center text-[#248A62]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Verified Health & Taste</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every dining partner undergoes university quality reviews with transparent student feedback and ratings.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E2633] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">AI Order Insights</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask AI about dietary nutrition, discover chef recommendations, and track spending trends in your dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
