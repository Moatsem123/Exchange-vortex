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
const BoxesPage = lazy(() => import("./pages/BoxesPage"));
const BoxGroupPage = lazy(() => import("./pages/BoxGroupPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const CapitalPage = lazy(() => import("./pages/CapitalPage"));
const ReconciliationPage = lazy(() => import("./pages/ReconciliationPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));

const UsersPage = lazy(() => import("./pages/UsersPage"));
const RolesPage = lazy(() => import("./pages/RolesPage"));
const PermissionsPage = lazy(() => import("./pages/PermissionsPage"));

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

    const timer = setTimeout(() => setShowSplash(false), SPLASH_MS);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || bootstrapping) return <PageLoader />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />

          <Route element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/customers" element={<CustomersPage />} />

            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/add-transaction" element={<AddTransactionPage />} />

            <Route path="/currencies" element={<CurrenciesPage />} />
            <Route path="/exchange-rates" element={<Navigate to="/currencies" replace />} />

            <Route path="/boxes" element={<BoxesPage />} />
            <Route path="/boxes/:type" element={<BoxGroupPage />} />

            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/capital" element={<CapitalPage />} />
            {/* <Route path="/reconciliation" element={<ReconciliationPage />} /> */}

            <Route path="/reports" element={<ReportsPage />} />

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/archive" element={<ArchivePage />} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            <Route
              path="/users"
              element={isAdmin ? <UsersPage /> : <Navigate to="/dashboard" replace />}
            />

            <Route
              path="/roles"
              element={isAdmin ? <RolesPage /> : <Navigate to="/dashboard" replace />}
            />

            <Route
              path="/permissions"
              element={isAdmin ? <PermissionsPage /> : <Navigate to="/dashboard" replace />}
            />
          </Route>

          <Route
            path="/"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
          />

          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}