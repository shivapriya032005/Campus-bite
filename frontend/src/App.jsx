import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RestaurantsPage from './pages/customer/RestaurantsPage';
import RestaurantDetailPage from './pages/customer/RestaurantDetailPage';

// Customer pages
import CartPage from './pages/customer/CartPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import InsightsPage from './pages/customer/InsightsPage';

// Owner pages
import OwnerDashboardPage from './pages/restaurant/OwnerDashboardPage';
import MenuManagementPage from './pages/restaurant/MenuManagementPage';
import OwnerOrdersPage from './pages/restaurant/OwnerOrdersPage';
import DeliveryAssignmentPage from './pages/restaurant/DeliveryAssignmentPage';
import RefundManagementPage from './pages/restaurant/RefundManagementPage';
import RemindersPage from './pages/restaurant/RemindersPage';

// Delivery pages
import DeliveryDashboardPage from './pages/delivery/DeliveryDashboardPage';
import DeliveryDetailPage from './pages/delivery/DeliveryDetailPage';
import DeliveryHistoryPage from './pages/delivery/DeliveryHistoryPage';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />

        {/* Customer Protected Routes */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={['customer']}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={['customer']}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute roles={['customer']}>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute roles={['customer']}>
              <InsightsPage />
            </ProtectedRoute>
          }
        />

        {/* Owner Protected Routes */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute roles={['owner']}>
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/menu"
          element={
            <ProtectedRoute roles={['owner']}>
              <MenuManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/orders"
          element={
            <ProtectedRoute roles={['owner']}>
              <OwnerOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/deliveries"
          element={
            <ProtectedRoute roles={['owner']}>
              <DeliveryAssignmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/refunds"
          element={
            <ProtectedRoute roles={['owner']}>
              <RefundManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reminders"
          element={
            <ProtectedRoute roles={['owner']}>
              <RemindersPage />
            </ProtectedRoute>
          }
        />

        {/* Delivery Partner Protected Routes */}
        <Route
          path="/delivery/dashboard"
          element={
            <ProtectedRoute roles={['delivery']}>
              <DeliveryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/orders"
          element={
            <ProtectedRoute roles={['delivery']}>
              <DeliveryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/orders/:id"
          element={
            <ProtectedRoute roles={['delivery']}>
              <DeliveryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/history"
          element={
            <ProtectedRoute roles={['delivery']}>
              <DeliveryHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
