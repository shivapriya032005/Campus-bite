import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Lock, Mail, User, Phone, MapPin, ChefHat, Truck, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'customer',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        phone: formData.phone || null,
        address: formData.address || null,
      });
      toast.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      value: 'customer',
      label: 'Student / Customer',
      desc: 'Order & track food',
      icon: User,
    },
    {
      value: 'owner',
      label: 'Restaurant Owner',
      desc: 'Manage kitchen & menu',
      icon: ChefHat,
    },
    {
      value: 'delivery',
      label: 'Delivery Partner',
      desc: 'Accept trips & deliver',
      icon: Truck,
    },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C5A46D]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
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
            Create an Account
          </h1>
          <p className="text-sm text-gray-400">
            Join the campus culinary network as a customer, owner, or courier
          </p>
        </div>

        <Card className="border border-[#1E2633] shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Select Your Account Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = formData.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.value })}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#C5A46D] bg-[#C5A46D]/10 ring-1 ring-[#C5A46D]/30'
                          : 'border-[#1E2633] bg-[#111827] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C5A46D]' : 'text-gray-400'}`} />
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#C5A46D]' : 'bg-transparent'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {r.label}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Full Name"
              name="full_name"
              icon={User}
              placeholder="Jane Doe"
              value={formData.full_name}
              onChange={handleChange}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@campus.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Password (min 8 chars)"
                name="password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <Input
                label="Confirm Password"
                name="confirm_password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Phone (optional)"
                name="phone"
                icon={Phone}
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={handleChange}
              />
              <Input
                label="Default Campus Address (optional)"
                name="address"
                icon={MapPin}
                placeholder="North Dorm, Room 302"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="mt-3"
            >
              Complete Registration <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-[#C5A46D] hover:underline font-medium">
              Sign In
            </Link>
          </div>
        </Card>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-[#248A62]" />
          <span>Strict role-based access control with secure bcrypt hashing</span>
        </div>
      </div>
    </div>
  );
}

