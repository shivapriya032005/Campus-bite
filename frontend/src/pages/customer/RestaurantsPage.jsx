import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Utensils, MapPin, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';

const CUISINES = [
  'All',
  'American',
  'Italian',
  'Bowls',
  'Pizza',
  'Burgers',
  'Coffee',
  'Healthy',
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'reviews' | 'newest'
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 12;

  const fetchRestaurants = async (searchTerm = search, pageNum = page) => {
    setLoading(true);
    try {
      const res = await api.get('/restaurants', {
        params: { search: searchTerm || undefined, page: pageNum, per_page: perPage },
      });
      setRestaurants(res.data.restaurants || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRestaurants(search, 1);
  };

  // Client-side filtering by cuisine & sorting
  const filteredRestaurants = restaurants
    .filter((r) => {
      if (selectedCuisine === 'All') return true;
      return (
        r.cuisine_type?.toLowerCase().includes(selectedCuisine.toLowerCase()) ||
        r.name?.toLowerCase().includes(selectedCuisine.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return Number(b.avg_rating || 0) - Number(a.avg_rating || 0);
      if (sortBy === 'reviews') return (b.total_reviews || 0) - (a.total_reviews || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
          Campus Food Discovery
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
          Campus Restaurants
        </h1>
        <p className="text-sm text-gray-400 max-w-xl">
          Order from vetted university dining venues, cafes, and artisanal bistros with verified reviews.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#171F2C] border border-gray-800 space-y-4 shadow-sm shadow-black/20">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search restaurants, cuisines, or locations..."
                className="w-full bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </form>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A222E] border border-gray-750 text-white text-xs rounded-xl px-3 py-2.5 focus:border-[#C5A46D] outline-none cursor-pointer"
            >
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="newest">Newest Listed</option>
            </select>
          </div>
        </div>

        {/* Cuisine Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-800/80">
          <span className="text-xs text-gray-400 font-medium mr-2">Cuisine:</span>
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                selectedCuisine === c
                  ? 'bg-[#C5A46D] text-gray-950 font-bold border-[#C5A46D] shadow-sm'
                  : 'bg-[#1A222E] text-gray-300 border-gray-800 hover:border-gray-700 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No restaurants match your criteria"
          description={
            search || selectedCuisine !== 'All'
              ? 'Try relaxing your search terms or selecting "All" cuisines.'
              : 'There are currently no active restaurants listed on campus.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedCuisine('All');
                fetchRestaurants('', 1);
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((r) => (
            <Link key={r.id} to={`/restaurants/${r.id}`} className="group block">
              <Card hover className="h-full flex flex-col justify-between overflow-hidden !p-0">
                <div>
                  <div className="h-48 bg-gray-800 relative overflow-hidden">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#1A222E]">
                        <Utensils className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {r.cuisine_type && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#111827]/90 text-xs font-semibold text-[#C5A46D] rounded-full border border-gray-750 backdrop-blur-sm">
                        {r.cuisine_type}
                      </span>
                    )}

                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#111827]/90 px-2 py-0.5 rounded-md border border-gray-700/80 text-xs font-bold text-[#C5A46D]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{Number(r.avg_rating || 0).toFixed(1)}</span>
                      <span className="text-gray-400 font-normal">({r.total_reviews})</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h2 className="font-serif text-xl font-bold text-white tracking-tight group-hover:text-[#C5A46D] transition-colors">
                      {r.name}
                    </h2>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {r.description || 'Artisanal dishes prepared daily for the campus community.'}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
                      <span className="truncate">{r.address || 'Campus Center'}</span>
                    </div>
                    <span className="text-[#C5A46D] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                      View Menu →
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > perPage && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-400 px-3">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= Math.ceil(total / perPage)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
