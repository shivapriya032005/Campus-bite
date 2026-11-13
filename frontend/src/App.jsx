import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Landing + auth pages stay in the main bundle (first paint); everything role-specific is
// code-split so a customer never downloads owner or courier code and vice versa.

// Public pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Customer pages (lazy)
const RestaurantsPage = lazy(() => import('./pages/customer/RestaurantsPage'));
const RestaurantDetailPage = lazy(() => import('./pages/customer/RestaurantDetailPage'));
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const OrdersPage = lazy(() => import('./pages/customer/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/customer/OrderDetailPage'));
const InsightsPage = lazy(() => import('./pages/customer/InsightsPage'));

// Owner pages (lazy)
const OwnerDashboardPage = lazy(() => import('./pages/restaurant/OwnerDashboardPage'));
const MenuManagementPage = lazy(() => import('./pages/restaurant/MenuManagementPage'));
const OwnerOrdersPage = lazy(() => import('./pages/restaurant/OwnerOrdersPage'));
const DeliveryAssignmentPage = lazy(() => import('./pages/restaurant/DeliveryAssignmentPage'));
const RefundManagementPage = lazy(() => import('./pages/restaurant/RefundManagementPage'));
const RemindersPage = lazy(() => import('./pages/restaurant/RemindersPage'));

// Delivery pages (lazy)
const DeliveryDashboardPage = lazy(() => import('./pages/delivery/DeliveryDashboardPage'));
const DeliveryDetailPage = lazy(() => import('./pages/delivery/DeliveryDetailPage'));
const DeliveryHistoryPage = lazy(() => import('./pages/delivery/DeliveryHistoryPage'));

export default function App() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
      </ErrorBoundary>
    </MainLayout>
  );
}

