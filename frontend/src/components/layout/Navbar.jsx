import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const cartCount = cart?.items?.length || 0;
  const links = user ? getLinks(user.role) : [];

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <UtensilsCrossed className="w-6 h-6 text-[#C5A46D]" />
            <span className="text-lg font-bold text-white tracking-tight">
              campus<span className="text-[#C5A46D]">bite</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400
                  hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold bg-[#C5A46D] hover:bg-[#b8954f]
                    text-gray-900 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Cart — customers only */}
                {user.role?.toLowerCase() === 'customer' && (
                  <Link
                    to="/cart"
                    className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center
                        text-[10px] font-bold bg-[#C5A46D] text-gray-900 rounded-full">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300
                      hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#C5A46D]/20 flex items-center justify-center
                      text-xs font-bold text-[#C5A46D]">
                      {(user.full_name || user.name || user.email)?.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[120px] truncate">{user.full_name || user.name || user.email}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700
                        rounded-lg shadow-xl z-20 py-1">
                        <div className="px-4 py-2 border-b border-gray-700">
                          <p className="text-sm font-medium text-white truncate">{user.full_name || user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400
                            hover:bg-gray-700 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-400
                  hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {user && user.role?.toLowerCase() === 'customer' && (
              <Link
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-400
                  hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart {cartCount > 0 && `(${cartCount})`}
              </Link>
            )}

            <div className="pt-2 border-t border-gray-800">
              {!user ? (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-semibold text-[#C5A46D] hover:text-[#b8954f] transition-colors"
                  >
                    Register
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user.full_name || user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400
                      hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
