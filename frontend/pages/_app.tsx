import type { AppProps } from "next/app";
import { CssBaseline } from "@mui/material";
import Navbar from "../components/Navbar";
// GSSoC: Import Footer component
import Footer from "../components/Footer";
import { useRouter } from "next/router";
import "../styles/globals.css";
import Head from "next/head";
import ScrollProgress from "../components/ScrollProgress";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hideNavbarRoutes = ["/", "/contact", "/auth/login", "/auth/register"];
  const showNavbar = !hideNavbarRoutes.includes(router.pathname);
  // GSSoC: Hide footer on auth pages
  const hideFooterRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/change-password",
    "/auth/forgot-password",
  ];
  const showFooter = !hideFooterRoutes.includes(router.pathname);
  return (
    <>
      <Head>
        <title>MedInternia</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <ScrollProgress />

      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <CssBaseline />
        {showNavbar && <Navbar route={router.pathname} />}
        <div
          style={{
            marginTop: showNavbar ? 64 : 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Component {...pageProps} />
        </div>
        {/* GSSoC: Render footer on non-auth pages */}
        {showFooter && <Footer />}
        <style jsx global>{`
          .mouse-droplet {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: radial-gradient(
              circle at 50% 50%,
              #6dd5ed 70%,
              #2193b0 100%
            );
            box-shadow: 0 0 8px 2px #6dd5ed88;
            opacity: 0.8;
            pointer-events: none;
            animation: dropletFade 0.4s forwards;
          }
          @keyframes dropletFade {
            0% {
              opacity: 0.8;
              transform: scale(1);
            }
            70% {
              opacity: 0.4;
              transform: scale(1.3);
            }
            100% {
              opacity: 0;
              transform: scale(0.7);
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default MyApp;
