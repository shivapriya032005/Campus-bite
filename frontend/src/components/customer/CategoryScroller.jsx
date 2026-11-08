import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { CATEGORY_IMAGES, PLACEHOLDERS } from '../../utils/imageRegistry';

const CATEGORIES = [
  { name: 'Biryani', query: 'Biryani', image: CATEGORY_IMAGES.biryani },
  { name: 'Pizza', query: 'Pizza', image: CATEGORY_IMAGES.pizza },
  { name: 'Burgers', query: 'Burger', image: CATEGORY_IMAGES.burgers },
  { name: 'Chinese', query: 'Chinese', image: CATEGORY_IMAGES.chinese },
  { name: 'South Indian', query: 'South Indian', image: CATEGORY_IMAGES['south indian'] },
  { name: 'North Indian', query: 'North Indian', image: CATEGORY_IMAGES['north indian'] },
  { name: 'Desserts', query: 'Dessert', image: CATEGORY_IMAGES.desserts },
  { name: 'Beverages', query: 'Beverage', image: CATEGORY_IMAGES.beverages },
  { name: 'Healthy Food', query: 'Healthy', image: CATEGORY_IMAGES['healthy food'] },
  { name: 'Snacks', query: 'Snack', image: CATEGORY_IMAGES.snacks },
];

export default function CategoryScroller({ activeCategory, onSelectCategory }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const handleScroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
    }
  };

  const handleClick = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat.query);
    } else {
      navigate(`/restaurants?search=${encodeURIComponent(cat.query)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Navigation arrows */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A46D] block mb-0.5">
            What's On Your Mind?
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Food Categories
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-8 h-8 rounded-full bg-[#171F2C] border border-[#1E2633] hover:border-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
            aria-label="Previous categories"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-8 h-8 rounded-full bg-[#171F2C] border border-[#1E2633] hover:border-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
            aria-label="Next categories"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontally Scrollable Categories */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory?.toLowerCase() === cat.query.toLowerCase();
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => handleClick(cat)}
              className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer focus:outline-none"
            >
              {/* Circular Thumbnail */}
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden p-0.5 border-2 transition-all duration-200 group-hover:scale-105 shadow-md ${
                  isSelected
                    ? 'border-[#C5A46D] ring-2 ring-[#C5A46D]/40 bg-[#C5A46D]/10'
                    : 'border-[#1E2633] group-hover:border-[#C5A46D]/60'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                  <SafeImage
                    src={cat.image}
                    alt={cat.name}
                    fallbackSrc={PLACEHOLDERS.food}
                    aspectRatio="aspect-square"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Title */}
              <span
                className={`text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  isSelected ? 'text-[#C5A46D]' : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
