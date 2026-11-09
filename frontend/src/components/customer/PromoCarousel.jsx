import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { PROMO_BANNERS, PLACEHOLDERS } from '../../utils/imageRegistry';

export default function PromoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const banner = PROMO_BANNERS[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-[#171F2C] border border-[#1E2633] shadow-2xl shadow-black/50 group">
      {/* Banner Backdrop Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden bg-gray-900">
        <SafeImage
          src={banner.image}
          alt={banner.title}
          fallbackSrc={PLACEHOLDERS.restaurant}
          aspectRatio="aspect-auto"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
        />

        {/* Ambient Dark Gradient Overlays for High Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />

        {/* Text Content Overlay */}
        <div className="absolute inset-0 p-6 sm:p-10 lg:p-12 flex flex-col justify-center max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-white w-fit shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A46D]" />
            <span>{banner.tag}</span>
          </div>

          <h3 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            {banner.title}
          </h3>

          <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
            {banner.subtitle}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/restaurants?search=${encodeURIComponent(banner.ctaQuery)}`)}
              className="px-5 py-2.5 rounded-xl bg-[#C5A46D] hover:bg-[#b5935b] text-gray-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-102 transition-all cursor-pointer"
            >
              <span>{banner.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handlePrev}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-6 sm:left-12 flex items-center gap-2 z-10">
          {PROMO_BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentIndex === i
                  ? 'w-8 bg-[#C5A46D]'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

