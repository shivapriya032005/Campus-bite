import { Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const ROLE_LABEL = { owner: 'restaurant owner', delivery: 'delivery partner' };

/** Shown instead of owner / delivery pages until an administrator approves the account. */
export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const roleLabel = ROLE_LABEL[user?.role?.toLowerCase()] || 'partner';

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card className="text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Hourglass className="w-6 h-6 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-white">Account awaiting approval</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Thanks for registering as a {roleLabel}. A CampusBite administrator needs to approve your
            account before you can {user?.role?.toLowerCase() === 'owner' ? 'manage menus and orders' : 'receive deliveries'}.
            Check back soon, or sign in again once you have been told you are approved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Check approval status
          </Button>
          <Link to="/restaurants">
            <Button variant="secondary">Browse restaurants</Button>
          </Link>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
