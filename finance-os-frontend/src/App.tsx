import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from './app/store';
import AppLayout from './components/layout/AppLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const CreditCards = lazy(() => import('./pages/CreditCards'));
const Debts = lazy(() => import('./pages/Debts'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Insights = lazy(() => import('./pages/Insights'));
const ArthyaSmartSync = lazy(() => import('./pages/WealthWiseSmartSync'));
const GmailSuccess = lazy(() => import('./pages/GmailSuccess'));
const Predictions = lazy(() => import('./pages/Predictions'));
const SavingsSuggestions = lazy(() => import('./pages/SavingsSuggestions'));
const SpendingAlerts = lazy(() => import('./pages/SpendingAlerts'));
const EMICalculator = lazy(() => import('./pages/EMICalculator'));
const DebtOptimizer = lazy(() => import('./pages/DebtOptimizer'));

const LazyLoad = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
    {children}
  </Suspense>
);

const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children ? <>{children}</> : <Outlet />;
};

const PublicRoute = ({ children }: { children?: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet />;
};

const App = () => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LazyLoad><Login /></LazyLoad>} />
        <Route path="/register" element={<LazyLoad><Register /></LazyLoad>} />
        <Route path="/forgot-password" element={<LazyLoad><ForgotPassword /></LazyLoad>} />
        <Route path="/reset-password" element={<LazyLoad><ResetPassword /></LazyLoad>} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<LazyLoad><Dashboard /></LazyLoad>} />
          <Route path="/expenses" element={<LazyLoad><Expenses /></LazyLoad>} />
          <Route path="/income" element={<LazyLoad><Income /></LazyLoad>} />
          <Route path="/credit-cards" element={<LazyLoad><CreditCards /></LazyLoad>} />
          <Route path="/debts" element={<LazyLoad><Debts /></LazyLoad>} />
          <Route path="/subscriptions" element={<LazyLoad><Subscriptions /></LazyLoad>} />
          <Route path="/budgets" element={<LazyLoad><Budgets /></LazyLoad>} />
          <Route path="/reports" element={<LazyLoad><Reports /></LazyLoad>} />
          <Route path="/notifications" element={<LazyLoad><Notifications /></LazyLoad>} />
          <Route path="/profile" element={<LazyLoad><Profile /></LazyLoad>} />
          <Route path="/insights" element={<LazyLoad><Insights /></LazyLoad>} />
           <Route path="/smart-sync" element={<LazyLoad><ArthyaSmartSync /></LazyLoad>} />
          <Route path="/gmail-success" element={<LazyLoad><GmailSuccess /></LazyLoad>} />
          <Route path="/predictions" element={<LazyLoad><Predictions /></LazyLoad>} />
          <Route path="/savings-suggestions" element={<LazyLoad><SavingsSuggestions /></LazyLoad>} />
          <Route path="/spending-alerts" element={<LazyLoad><SpendingAlerts /></LazyLoad>} />
          <Route path="/tools/emi-calculator" element={<LazyLoad><EMICalculator /></LazyLoad>} />
          <Route path="/debt-optimizer" element={<LazyLoad><DebtOptimizer /></LazyLoad>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
