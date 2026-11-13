import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import PendingApprovalPage from '../../pages/PendingApprovalPage';

// Roles that need administrator approval before their dashboards work (enforced by the API too).
const APPROVAL_REQUIRED = ['owner', 'delivery'];

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toLowerCase();

  if (roles && roles.length > 0) {
    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  if (APPROVAL_REQUIRED.includes(userRole) && user.is_approved === false) {
    return <PendingApprovalPage />;
  }

  return children;
}
