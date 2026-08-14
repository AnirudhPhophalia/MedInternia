import type { AppProps } from "next/app";
import { ReactNode, useEffect, useState } from "react";
import { CssBaseline, Snackbar, Alert, Typography, Fab } from "@mui/material";
import { useNotifications } from "../hooks/useNotifications";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { CustomThemeProvider } from "../context/ThemeContext";
import ErrorBoundary from "../components/ErrorBoundary";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import { useRouter } from "next/router";
import "../styles/globals.css";
import Head from "next/head";
import ChatIcon from "@mui/icons-material/Chat";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import "../i18n";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
const Chatbot = dynamic(() => import("../components/Chatbot"), {
  ssr: false,
  loading: () => null,
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const PUBLIC_ROUTES = [
  "/",
  "/landing",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/change-password",
  "/404",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const publicRoute = isPublicRoute(router.pathname);

  useEffect(() => {
    if (publicRoute || isLoading) return;

    if (!isAuthenticated) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(router.asPath)}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicRoute, isLoading, isAuthenticated, router.pathname]);

  if (publicRoute) return <>{children}</>;
  if (isLoading || !isAuthenticated) {
    const message = isLoading
      ? "Checking your session…"
      : "Redirecting to sign in…";

    return (
      <div
        aria-busy={isLoading}
        aria-live="polite"
        role="status"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <Typography>{message}</Typography>
      </div>
    );
  }
  return <>{children}</>;
}

function NotificationSnackbar() {
  const router = useRouter();
  const { newToast, clearToast } = useNotifications();

  return (
    <Snackbar
      open={!!newToast}
      autoHideDuration={4000}
      onClose={clearToast}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={clearToast}
        severity="info"
        variant="filled"
        onClick={() => {
          if (newToast?.link) router.push(newToast.link);
          clearToast();
        }}
        sx={{
          cursor: newToast?.link ? "pointer" : "default",
          background: (theme: any) => theme.custom.navbarGradient,
          color: "white",
          minWidth: 280,
          "& .MuiAlert-icon": { color: "white" },
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          New Notification
        </Typography>
        <Typography variant="caption">{newToast?.message}</Typography>
      </Alert>
    </Snackbar>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [chatbotLoaded, setChatbotLoaded] = useState(false);
  const [initialOpenPending, setInitialOpenPending] = useState(false);

  const hideNavbarRoutes = ["/", "/contact", "/auth/login", "/auth/register"];
  const showNavbar = !hideNavbarRoutes.includes(router.pathname);
  const hideFooterRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/change-password",
    "/auth/forgot-password",
  ];
  const showFooter = !hideFooterRoutes.includes(router.pathname);
  const eligiblePage =
    router.pathname !== "/" && router.pathname !== "/landing";

  useEffect(() => {
    if (initialOpenPending) {
      setInitialOpenPending(false);
    }
  }, [initialOpenPending]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <CustomThemeProvider>
          <Head>
            <title>MedInternia</title>
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            <link rel="shortcut icon" href="/favicon.ico" />

            {/* --- PWA META TAGS --- */}
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#000000" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta
              name="apple-mobile-web-app-status-bar-style"
              content="default"
            />
            <meta name="apple-mobile-web-app-title" content="MedInternia" />
            <link rel="apple-touch-icon" href="/icon-192x192.png" />
          </Head>

          <div
            className={inter.className}
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
              overflowX: "hidden",
              maxWidth: "100%",
            }}
          >
            <CssBaseline />

            {showNavbar && <Navbar />}

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <AuthGate>
                <Component {...pageProps} />
              </AuthGate>
            </div>

            {showFooter && <Footer />}
            <ScrollToTop />
            {!chatbotLoaded && eligiblePage && (
              <Fab
                color="primary"
                onClick={() => {
                  setChatbotLoaded(true);
                  setInitialOpenPending(true);
                }}
                aria-label="Open MedInternia assistant"
                sx={{
                  position: "fixed",
                  bottom: 20,
                  right: 20,
                  zIndex: 9999,
                }}
              >
                <ChatIcon />
              </Fab>
            )}
            {chatbotLoaded && eligiblePage && (
              <Chatbot initialOpen={initialOpenPending} />
            )}

            <NotificationSnackbar />
            <ReactQueryDevtools initialIsOpen={false} />
          </div>
        </CustomThemeProvider>
      </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
