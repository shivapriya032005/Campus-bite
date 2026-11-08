import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Star, Utensils, SlidersHorizontal, ArrowUpDown, X, Sparkles, Filter } from 'lucide-react';
import api from '../../api/client';
import RestaurantCard from '../../components/customer/RestaurantCard';
import CategoryScroller from '../../components/customer/CategoryScroller';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

const CUISINES = [
  'All',
  'Biryani',
  'Pizza',
  'Burgers',
  'Chinese',
  'South Indian',
  'North Indian',
  'Healthy',
  'Desserts',
];

export default function RestaurantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'reviews' | 'delivery'
  const [filterRating4Plus, setFilterRating4Plus] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== search) {
      setSearch(q);
      fetchRestaurants(q);
    } else {
      fetchRestaurants(search);
    }
  }, [searchParams]);

  const fetchRestaurants = async (searchTerm = search) => {
    setLoading(true);
    try {
      const res = await api.get('/restaurants', {
        params: { search: searchTerm || undefined, page: 1, per_page: perPage },
      });
      setRestaurants(res.data.restaurants || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchParams({ search: search.trim() });
    } else {
      setSearchParams({});
    }
    fetchRestaurants(search.trim());
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchParams({});
    fetchRestaurants('');
  };

  // Client-side filtering & sorting
  const filteredRestaurants = restaurants
    .filter((r) => {
      // Cuisine filter
      if (selectedCuisine !== 'All') {
        const matchesCuisine =
          r.cuisine_type?.toLowerCase().includes(selectedCuisine.toLowerCase()) ||
          r.name?.toLowerCase().includes(selectedCuisine.toLowerCase());
        if (!matchesCuisine) return false;
      }
      // Rating filter (4.5+)
      if (filterRating4Plus) {
        if (Number(r.avg_rating || 0) < 4.5) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return Number(b.avg_rating || 0) - Number(a.avg_rating || 0);
      if (sortBy === 'reviews') return (b.total_reviews || 0) - (a.total_reviews || 0);
      if (sortBy === 'delivery') return a.id - b.id; // closer/faster
      return 0;
    });

  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Header */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Explore Campus Eateries
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
          All Restaurants & Dining Halls
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Discover culinary favorites from vetted university dining venues, cafes, and artisanal bistros with verified campus ratings and dorm delivery.
        </p>
      </div>

      {/* Visual Category Scroller at Top */}
      <section className="pt-2">
        <CategoryScroller
          activeCategory={selectedCuisine === 'All' ? null : selectedCuisine}
          onSelectCategory={(catQuery) => {
            setSelectedCuisine(catQuery);
            setSearch('');
            setSearchParams({});
          }}
        />
      </section>

      {/* Swiggy-Grade Filter & Search Tool Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#171F2C] border border-[#1E2633] space-y-4 shadow-xl shadow-black/20">
        {/* Search Bar + Sort Row */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search restaurants, cuisines, or campus locations..."
                className="w-full bg-[#111827] border border-[#1E2633] focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D]/30 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="primary" size="md" className="rounded-xl shrink-0">
              Search
            </Button>
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <ArrowUpDown className="w-4 h-4 text-[#C5A46D] shrink-0" />
            <select
              aria-label="Sort restaurants by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#111827] border border-[#1E2633] focus:border-[#C5A46D] rounded-xl px-3 py-2 text-xs text-white font-medium outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="rating">Sort: Highest Rated</option>
              <option value="reviews">Sort: Most Reviews</option>
              <option value="delivery">Sort: Fastest Delivery</option>
            </select>
          </div>
        </div>

        {/* Cuisines & Quick Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1E2633]">
          {/* Cuisine Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCuisine(c)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                  selectedCuisine === c
                    ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                    : 'bg-[#111827] text-gray-400 border-[#1E2633] hover:border-gray-700 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Quick Filter: 4.5+ Rating */}
          <button
            type="button"
            onClick={() => setFilterRating4Plus(!filterRating4Plus)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              filterRating4Plus
                ? 'bg-[#248A62]/20 text-[#248A62] border-[#248A62]'
                : 'bg-[#111827] text-gray-400 border-[#1E2633] hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterRating4Plus ? 'fill-current' : ''}`} />
            <span>Ratings 4.5+</span>
          </button>
        </div>
      </div>

      {/* Result Status Strip */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-400">
        <span>
          Showing <strong className="text-white">{filteredRestaurants.length}</strong> campus venues
          {selectedCuisine !== 'All' && <span> in "{selectedCuisine}"</span>}
          {search && <span> matching "{search}"</span>}
        </span>
        {(selectedCuisine !== 'All' || search || filterRating4Plus) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCuisine('All');
              setSearch('');
              setSearchParams({});
              setFilterRating4Plus(false);
              fetchRestaurants('');
            }}
            className="text-[#C5A46D] hover:underline font-semibold cursor-pointer"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Restaurant Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No restaurants match your filters"
          description="Try broadening your search term or selecting 'All' cuisines."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedCuisine('All');
                setSearch('');
                setSearchParams({});
                setFilterRating4Plus(false);
                fetchRestaurants('');
              }}
            >
              Show All Campus Eateries
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredRestaurants.map((rest) => (
            <RestaurantCard key={rest.id} restaurant={rest} />
          ))}
        </div>
      )}
    </div>
  );
}
