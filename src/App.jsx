import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import PageLoader from "./shared/PageLoader";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./shared/Toast";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const AddTransactionPage = lazy(() => import("./pages/AddTransactionPage"));
const CurrenciesPage = lazy(() => import("./pages/CurrenciesPage"));
const ExchangeRatesPage = lazy(() => import("./pages/ExchangeRatesPage"));
const FundsPage = lazy(() => import("./pages/FundsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));

const SPLASH_MS = 1200;

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  );
}

function Shell() {
  const { isLoggedIn, bootstrapping, isAdmin } = useAuth();
  const [showSplash, setShowSplash] = useState(SPLASH_MS > 0);

  useEffect(() => {
    if (SPLASH_MS <= 0) return;
    const t = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (showSplash || bootstrapping) return <PageLoader />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/change-password" element={isLoggedIn ? <ChangePasswordPage /> : <Navigate to="/login" replace />} />

          <Route element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/add-transaction" element={<AddTransactionPage />} />
            <Route path="/currencies" element={<CurrenciesPage />} />
            <Route path="/exchange-rates" element={<ExchangeRatesPage />} />
            <Route path="/funds" element={<FundsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={isAdmin ? <SettingsPage /> : <Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="/" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
          <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}