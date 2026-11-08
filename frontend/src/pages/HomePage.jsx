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
  Coffee,
  Pizza,
  Flame,
  Award,
  Plus,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';

const CATEGORIES = [
  { name: 'Burgers & Grills', icon: Flame, query: 'Burger' },
  { name: 'Healthy Bowls', icon: Utensils, query: 'Bowl' },
  { name: 'Artisan Pizza', icon: Pizza, query: 'Pizza' },
  { name: 'Cold Brew & Cafes', icon: Coffee, query: 'Coffee' },
];

export default function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState('checking');

  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Health check
    api
      .get('/health')
      .then(() => setHealth('connected'))
      .catch(() => setHealth('unavailable'));

    // Fetch featured restaurants
    api
      .get('/restaurants', { params: { per_page: 6 } })
      .then((res) => setRestaurants(res.data.restaurants || []))
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
    <div className="space-y-20 pb-8">
      {/* Editorial Hero Section */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A46D]/15 border border-[#C5A46D]/30 text-[#C5A46D] text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Campus Gastronomy · Swift Dorm Delivery</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08]">
          Exceptional meals.<br />
          <span className="italic font-normal text-[#C5A46D]">Crafted for campus.</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Discover culinary favorites from independent campus kitchens, track every preparation milestone in real-time, and experience effortless dorm delivery.
        </p>

        {/* Hero Search Bar */}
        <div className="max-w-2xl mx-auto pt-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-[#1A222E] border border-gray-700/80 hover:border-gray-600 focus-within:border-[#C5A46D] focus-within:ring-2 focus-within:ring-[#C5A46D]/20 rounded-2xl p-1.5 shadow-xl shadow-black/40 transition-all"
          >
            <div className="pl-4 pr-2 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search by restaurant name, cuisine, or dish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none py-3 text-sm text-white placeholder-gray-400 focus:outline-none"
            />
            <Button type="submit" variant="primary" size="md" className="rounded-xl shrink-0">
              Explore Menu
            </Button>
          </form>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span className="text-xs text-gray-400 font-medium mr-1">Trending:</span>
            {CATEGORIES.map(({ name, query }) => (
              <button
                key={name}
                onClick={() => navigate(`/restaurants?search=${encodeURIComponent(query)}`)}
                className="text-xs px-3 py-1 rounded-full bg-[#1A222E] hover:bg-[#202631] text-gray-300 hover:text-white border border-gray-800 transition-colors cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* System Core Pill */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A222E]/80 border border-gray-800 text-[11px] text-gray-400">
            <span
              className={`w-2 h-2 rounded-full ${
                health === 'connected'
                  ? 'bg-[#248A62] animate-pulse'
                  : health === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-red-400'
              }`}
            />
            <span>
              Kitchen Core & Database:{' '}
              <strong className="text-white font-medium">
                {health === 'connected' ? 'Operational' : health === 'checking' ? 'Connecting...' : 'Offline'}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* Popular Campus Categories */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-gray-800/80 pb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Curated Categories
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Explore chef-driven options across campus cafeterias and eateries
            </p>
          </div>
          <Link
            to="/restaurants"
            className="text-xs sm:text-sm font-semibold text-[#C5A46D] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(({ name, icon: Icon, query }) => (
            <div
              key={name}
              onClick={() => navigate(`/restaurants?search=${encodeURIComponent(query)}`)}
              className="p-5 rounded-xl bg-[#171F2C] border border-gray-800/80 hover:border-[#C5A46D]/60 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C5A46D]/10 border border-[#C5A46D]/20 flex items-center justify-center text-[#C5A46D] mb-3 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white text-sm sm:text-base">{name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Explore dishes →</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Campus Eateries */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-gray-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D] uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5" /> High Campus Ratings
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Featured Eateries
            </h2>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <Card className="text-center py-12">
            <Utensils className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No active eateries yet</h3>
            <p className="text-xs text-gray-400 mt-1">Check back shortly or register a restaurant.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {restaurants.map((rest) => (
              <Link key={rest.id} to={`/restaurants/${rest.id}`} className="group block">
                <Card hover className="h-full flex flex-col justify-between overflow-hidden !p-0">
                  <div>
                    {/* Visual Photo */}
                    <div className="h-48 bg-gray-800 relative overflow-hidden">
                      {rest.image_url ? (
                        <img
                          src={rest.image_url}
                          alt={rest.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1A222E]">
                          <Utensils className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {rest.cuisine_type && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#111827]/85 backdrop-blur-sm text-xs font-medium text-[#C5A46D] border border-gray-750 rounded-full">
                          {rest.cuisine_type}
                        </span>
                      )}

                      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#111827]/90 px-2 py-0.5 rounded-md border border-gray-700/80 text-xs font-bold text-[#C5A46D]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{Number(rest.avg_rating || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 space-y-2">
                      <h3 className="font-serif text-lg font-bold text-white tracking-tight group-hover:text-[#C5A46D] transition-colors">
                        {rest.name}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {rest.description || 'Artisanal dishes prepared daily for the campus community.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
                        <span className="truncate">{rest.address || 'Campus Center'}</span>
                      </div>
                      <span className="text-[#C5A46D] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* The CampusBite Standard / Why CampusBite */}
      <section className="rounded-2xl bg-[#141B26] border border-gray-800 p-8 sm:p-12 relative overflow-hidden">
        <div className="max-w-3xl space-y-4 mb-10">
          <span className="text-xs font-semibold text-[#C5A46D] uppercase tracking-wider">
            Engineered for Campus Life
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Elevating campus dining into an effortless art.
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            From late-night study sessions in the library to quick lunch runs between lectures, CampusBite is designed to provide speed, visual clarity, and complete transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-[#1A222E] border border-gray-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#C5A46D]/15 text-[#C5A46D] flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-white text-base">Direct Kitchen Tickets</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Orders bypass external aggregators and dispatch directly to university kitchen displays with real-time cooking status.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#1A222E] border border-gray-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-white text-base">Student Courier Network</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Trained campus couriers pick up orders directly when marked READY and deliver them straight to your residential hall door.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#1A222E] border border-gray-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-white text-base">AI Order Intelligence</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask natural questions to analyze your meal history, summarize spending, or recall your favorite dishes using OpenAI.
            </p>
          </div>
        </div>
      </section>

      {/* AI Assistant Banner */}
      <section>
        <Card className="bg-gradient-to-r from-[#171F2C] via-[#1A222E] to-[#171F2C] border border-[#C5A46D]/40 p-8 sm:p-10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A46D] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Server-Side AI Intelligence
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Discover your dining habits with CampusBite AI
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                "What did I spend on burgers this week?", "Summarize my last five orders", or "Which restaurant do I order from most frequently?"
              </p>
            </div>

            <div className="shrink-0">
              <Link to="/insights">
                <Button variant="primary" size="lg" className="shadow-lg shadow-[#C5A46D]/20">
                  Launch AI Assistant <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
