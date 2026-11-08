import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Store,
  ClipboardList,
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Truck,
  RefreshCcw,
  Bell,
  MapPin,
  Search,
  Tag,
  HelpCircle,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import LocationModal from '../customer/LocationModal';
import OffersModal from '../customer/OffersModal';
import HelpModal from '../customer/HelpModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  // Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Selected delivery location
  const [deliveryLocation, setDeliveryLocation] = useState(
    () => localStorage.getItem('campusbite_location') || user?.address || 'North Quad Dorm, Hall C'
  );

  useEffect(() => {
    if (user?.address && !localStorage.getItem('campusbite_location')) {
      setDeliveryLocation(user.address);
    }
  }, [user]);

  const handleUpdateLocation = (newLoc) => {
    setDeliveryLocation(newLoc);
    localStorage.setItem('campusbite_location', newLoc);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch('');
      setMobileOpen(false);
    }
  };

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const cartTotal = cart?.total || 0;

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/login');
  };

  const isOwner = user?.role?.toLowerCase() === 'owner';
  const isCourier = user?.role?.toLowerCase() === 'delivery';
  const isCustomer = !user || (!isOwner && !isCourier);

  return (
    <>
      <nav className="bg-[#111827]/95 backdrop-blur-md border-b border-[#1E2633] sticky top-0 z-40 transition-colors shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Brand + Delivery Location Selector */}
            <div className="flex items-center gap-4 lg:gap-6 shrink-0">
              <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A46D] to-[#9E7D47] flex items-center justify-center text-[#111827] group-hover:scale-105 transition-transform shadow-md shadow-[#C5A46D]/20">
                  <UtensilsCrossed className="w-5 h-5 font-bold" />
                </div>
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                  campus<span className="text-[#C5A46D]">bite</span>
                </span>
              </Link>

              {/* Delivery Location Pill (Swiggy-style) */}
              {isCustomer && (
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#171F2C] border border-[#1E2633] hover:border-[#C5A46D]/60 text-left transition-all group cursor-pointer max-w-[220px] lg:max-w-[280px]"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
                  <div className="truncate text-xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block leading-none">
                      Deliver to
                    </span>
                    <span className="text-white font-medium truncate block mt-0.5">
                      {deliveryLocation.split(',')[0]}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-white shrink-0 ml-auto" />
                </button>
              )}
            </div>

            {/* Middle: Global Search Input (Swiggy-style) */}
            {isCustomer && (
              <form
                onSubmit={handleSearchSubmit}
                className="hidden lg:flex items-center flex-1 max-w-xs xl:max-w-md relative mx-2"
              >
                <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for restaurants, biryani, pizza..."
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  className="w-full bg-[#171F2C] border border-[#1E2633] focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D]/30 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-400 outline-none transition-all"
                />
              </form>
            )}

            {/* Right: Actions (Restaurants, Offers, Help, Cart, Profile) */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
              {isCustomer && (
                <>
                  <Link
                    to="/restaurants"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      location.pathname.startsWith('/restaurants')
                        ? 'text-white bg-[#1E2633]'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    <Store className="w-4 h-4 text-[#C5A46D]" />
                    <span>Restaurants</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setOffersModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-orange-400" />
                    <span>Offers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHelpModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Help</span>
                  </button>
                </>
              )}

              {/* Owner navigation shortcuts */}
              {isOwner && (
                <>
                  <Link
                    to="/owner/dashboard"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/owner/menu"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60"
                  >
                    Menu
                  </Link>
                  <Link
                    to="/owner/orders"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60"
                  >
                    Kitchen Orders
                  </Link>
                </>
              )}

              {/* Courier navigation shortcuts */}
              {isCourier && (
                <>
                  <Link
                    to="/delivery/dashboard"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60"
                  >
                    Courier Hub
                  </Link>
                  <Link
                    to="/delivery/history"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60"
                  >
                    Trip History
                  </Link>
                </>
              )}

              {/* Cart Button (Always visible for Customers) */}
              {isCustomer && (
                <Link
                  to="/cart"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                    cartCount > 0
                      ? 'bg-[#C5A46D] text-gray-950 border-[#C5A46D] shadow-md shadow-[#C5A46D]/20 hover:bg-[#b5935b]'
                      : 'bg-[#171F2C] text-gray-300 border-[#1E2633] hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-gray-950 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span>Cart</span>
                  {cartCount > 0 && (
                    <span className="font-mono text-[11px] ml-0.5">
                      ${Number(cartTotal).toFixed(2)}
                    </span>
                  )}
                </Link>
              )}

              {/* User Account / Profile */}
              {user ? (
                <div className="relative ml-1">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#171F2C] border border-[#1E2633] hover:border-[#C5A46D]/50 text-xs text-white transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C5A46D]/20 text-[#C5A46D] font-bold flex items-center justify-center text-[10px]">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium max-w-[90px] truncate">{user.full_name}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#171F2C] border border-[#1E2633] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-[#1E2633]">
                        <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#C5A46D]/15 text-[#C5A46D] text-[10px] font-semibold uppercase">
                          {user.role}
                        </span>
                      </div>

                      {isCustomer && (
                        <>
                          <Link
                            to="/orders"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-[#C5A46D]" />
                            <span>My Orders</span>
                          </Link>
                          <Link
                            to="/insights"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#C5A46D]" />
                            <span>AI Order Insights</span>
                          </Link>
                        </>
                      )}

                      {isOwner && (
                        <>
                          <Link
                            to="/owner/deliveries"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60"
                          >
                            <Truck className="w-3.5 h-3.5 text-[#C5A46D]" />
                            <span>Dispatch Couriers</span>
                          </Link>
                          <Link
                            to="/owner/refunds"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60"
                          >
                            <RefreshCcw className="w-3.5 h-3.5 text-[#C5A46D]" />
                            <span>Refund Disputes</span>
                          </Link>
                          <Link
                            to="/owner/reminders"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60"
                          >
                            <Bell className="w-3.5 h-3.5 text-[#C5A46D]" />
                            <span>Kitchen Reminders</span>
                          </Link>
                        </>
                      )}

                      <div className="pt-1 mt-1 border-t border-[#1E2633]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-[#171F2C] border border-[#1E2633] hover:border-[#C5A46D] text-xs font-bold text-white transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Actions: Cart + Hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {isCustomer && (
                <Link
                  to="/cart"
                  className="p-2 rounded-lg bg-[#171F2C] border border-[#1E2633] text-white relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#C5A46D] text-gray-950 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg bg-[#171F2C] border border-[#1E2633] text-gray-300 hover:text-white"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#1E2633] bg-[#111827] px-4 py-4 space-y-4">
            {/* Location selector mobile */}
            {isCustomer && (
              <button
                type="button"
                onClick={() => {
                  setLocationModalOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-[#171F2C] border border-[#1E2633] flex items-center gap-2 text-xs text-left"
              >
                <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <div className="truncate flex-1">
                  <span className="text-[10px] text-gray-400 block">Deliver to:</span>
                  <span className="text-white font-semibold truncate block">
                    {deliveryLocation}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}

            {/* Mobile Search */}
            {isCustomer && (
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search restaurants or dishes..."
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  className="w-full bg-[#171F2C] border border-[#1E2633] focus:border-[#C5A46D] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-400 outline-none"
                />
              </form>
            )}

            {/* Nav Links */}
            <div className="space-y-1 pt-2 border-t border-[#1E2633]">
              {isCustomer && (
                <>
                  <Link
                    to="/restaurants"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <Store className="w-4 h-4 text-[#C5A46D]" />
                    <span>Browse Restaurants</span>
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <ClipboardList className="w-4 h-4 text-[#C5A46D]" />
                    <span>Order History</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOffersModalOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 text-left"
                  >
                    <Tag className="w-4 h-4 text-orange-400" />
                    <span>Active Offers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHelpModalOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Help & FAQs</span>
                  </button>
                </>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 text-left pt-3 mt-2 border-t border-[#1E2633]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.full_name})</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center w-full py-2.5 rounded-xl bg-[#C5A46D] text-gray-950 font-bold text-xs"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Global Modals */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={deliveryLocation}
        onSelectLocation={handleUpdateLocation}
      />
      <OffersModal isOpen={offersModalOpen} onClose={() => setOffersModalOpen(false)} />
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </>
  );
}
