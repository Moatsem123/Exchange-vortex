import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import PageLoader from "./shared/PageLoader";
import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const AddTransactionPage = lazy(() => import("./pages/AddTransactionPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));

const SPLASH_MS = 1200;

function App() {
  const [showSplash, setShowSplash] = useState(SPLASH_MS > 0);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  useEffect(() => {
    if (SPLASH_MS <= 0) return;
    const timer = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleLogin() {
    setIsLoggedIn(true);
  }

  if (showSplash) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />

          <Route
            element={
              isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/add-transaction" element={<AddTransactionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route
            path="/"
            element={
              <Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />
            }
          />

          <Route
            path="*"
            element={
              <Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
