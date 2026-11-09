import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Lock, Mail, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name || 'User'}!`);
      const role = user.role?.toLowerCase();
      if (role === 'owner') {
        navigate('/owner/dashboard');
      } else if (role === 'delivery') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/restaurants');
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Network or connection error. Please verify backend is reachable.'
          : 'Invalid email or password');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C5A46D]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C5A46D] to-[#9E7D47] flex items-center justify-center shadow-lg shadow-[#C5A46D]/20">
              <UtensilsCrossed className="w-5 h-5 text-[#111827]" />
            </div>
            <span className="font-serif text-2xl font-bold text-white tracking-tight">
              campus<span className="text-[#C5A46D]">bite</span>
            </span>
          </Link>
          <h1 className="font-serif text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-400">
            Sign in to access your orders, kitchen operations, or courier hub
          </p>
        </div>

        <Card className="border border-[#1E2633] shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="you@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              Sign In to CampusBite <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 pt-5 border-t border-[#1E2633]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A46D]" /> Demo Fast-Login
              </span>
              <span className="text-[11px] text-gray-500">Click to fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('student@campus.edu', 'Student1234!')}
                className="px-2 py-1.5 rounded-lg bg-[#111827] border border-[#1E2633] hover:border-[#C5A46D]/50 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('owner@campus.edu', 'Owner1234!')}
                className="px-2 py-1.5 rounded-lg bg-[#111827] border border-[#1E2633] hover:border-[#C5A46D]/50 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('courier@campus.edu', 'Courier1234!')}
                className="px-2 py-1.5 rounded-lg bg-[#111827] border border-[#1E2633] hover:border-[#C5A46D]/50 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center"
              >
                Courier
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#C5A46D] hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </Card>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-[#248A62]" />
          <span>Secured with JWT authentication & salted bcrypt encryption</span>
        </div>
      </div>
    </div>
  );
}

