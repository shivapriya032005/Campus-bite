import { useState } from 'react';
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
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const CUSTOMER_LINKS = [
  { to: '/restaurants', label: 'Restaurants', icon: Store },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/insights', label: 'AI Insights', icon: Sparkles },
];

const OWNER_LINKS = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/menu', label: 'Menu', icon: BookOpen },
  { to: '/owner/orders', label: 'Orders', icon: ClipboardList },
  { to: '/owner/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/owner/refunds', label: 'Refunds', icon: RefreshCcw },
  { to: '/owner/reminders', label: 'Reminders', icon: Bell },
];

const DELIVERY_LINKS = [
  { to: '/delivery/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/delivery/orders', label: 'My Deliveries', icon: Truck },
];

function getLinks(role) {
  const r = role?.toLowerCase();
  if (r === 'owner') return OWNER_LINKS;
  if (r === 'delivery') return DELIVERY_LINKS;
  return CUSTOMER_LINKS;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const links = user ? getLinks(user.role) : [{ to: '/restaurants', label: 'Restaurants', icon: Store }];

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/login');
  };

  const roleLabel =
    user?.role?.toLowerCase() === 'owner'
      ? 'Restaurant Owner'
      : user?.role?.toLowerCase() === 'delivery'
      ? 'Courier'
      : 'Student / Customer';

  return (
    <nav className="bg-[#111827]/90 backdrop-blur-md border-b border-gray-800/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#C5A46D]/15 border border-[#C5A46D]/30 flex items-center justify-center text-[#C5A46D] group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              campus<span className="text-[#C5A46D]">bite</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    active
                      ? 'text-white bg-[#202631] shadow-inner border border-gray-750'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#C5A46D]' : 'text-gray-500'}`} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs lg:text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs lg:text-sm font-semibold bg-[#C5A46D] hover:bg-[#b8955a] text-gray-950 rounded-lg shadow-sm shadow-[#C5A46D]/15 transition-all active:scale-[0.98]"
                >
                  Create Account
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Cart — customers or public */}
                {(!user || user.role?.toLowerCase() === 'customer') && (
                  <Link
                    to="/cart"
                    className="relative p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#202631] border border-transparent hover:border-gray-750 transition-all"
                    aria-label="View shopping cart"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[#C5A46D] text-gray-950 rounded-full shadow">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs lg:text-sm text-gray-200 hover:text-white bg-[#1A222E] border border-gray-750/80 hover:border-gray-650 transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#C5A46D]/15 text-[#C5A46D] font-bold text-xs flex items-center justify-center border border-[#C5A46D]/30">
                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left max-w-[110px] truncate">
                      <p className="font-semibold text-white leading-tight truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-[10px] text-[#C5A46D] leading-tight capitalize">
                        {user.role}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-[#18212D] border border-gray-750 rounded-xl shadow-2xl shadow-black/60 z-20 py-2 divide-y divide-gray-750">
                        <div className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-white truncate">
                            {user.full_name || 'Campus User'}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                          <span className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded bg-[#C5A46D]/15 text-[#C5A46D] border border-[#C5A46D]/30 font-medium">
                            {roleLabel}
                          </span>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#C94F50] hover:bg-gray-800 transition-colors cursor-pointer text-left font-medium"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800 bg-[#111827] px-4 py-4 space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Icon className="w-4 h-4 text-[#C5A46D]" />
              {label}
            </Link>
          ))}

          {(!user || user.role?.toLowerCase() === 'customer') && (
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4 text-[#C5A46D]" />
                Cart
              </div>
              {cartCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-[#C5A46D] text-gray-950 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          <div className="pt-3 border-t border-gray-800">
            {!user ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-center text-sm rounded-lg bg-gray-800 text-white font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-center text-sm rounded-lg bg-[#C5A46D] text-gray-950 font-semibold"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-1">
                  <p className="text-xs font-bold text-white">{user.full_name}</p>
                  <p className="text-[11px] text-gray-400">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#C94F50] rounded-lg hover:bg-gray-800"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
