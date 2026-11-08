import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Utensils, MapPin } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Discover Campus Dining</h1>
          <p className="text-gray-400 mt-1">Browse menus and order from your favorite campus spots</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <div className="flex-1">
            <Input
              placeholder="Search by restaurant or cuisine..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#C5A46D] hover:bg-[#b8954f] text-gray-900 font-semibold rounded-lg text-sm transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : restaurants.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No restaurants found"
          description={search ? `No results matching "${search}"` : 'There are currently no active restaurants listed.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((r) => (
            <Link key={r.id} to={`/restaurants/${r.id}`}>
              <Card hover className="h-full flex flex-col justify-between">
                <div>
                  <div className="h-44 bg-gray-700/50 rounded-lg overflow-hidden relative mb-4">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-750">
                        <Utensils className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    {r.cuisine_type && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/80 backdrop-blur-sm text-xs font-medium text-[#C5A46D] rounded-full border border-gray-700">
                        {r.cuisine_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">{r.name}</h2>
                    <div className="flex items-center gap-1 bg-[#C5A46D]/10 text-[#C5A46D] px-2 py-0.5 rounded text-xs font-semibold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{Number(r.avg_rating || 0).toFixed(1)}</span>
                      <span className="text-gray-400 font-normal">({r.total_reviews})</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {r.description || 'Delicious meals prepared fresh daily for the campus community.'}
                  </p>
                </div>

                {r.address && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t border-gray-700/50 pt-3">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A46D]" />
                    <span className="truncate">{r.address}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > perPage && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400 px-2">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          <button
            disabled={page >= Math.ceil(total / perPage)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
