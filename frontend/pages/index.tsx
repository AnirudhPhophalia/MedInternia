import React from "react";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import { Box } from '@mui/material';

import SEO from "../components/SEO";
import LandingHeader from "../components/landing/LandingHeader";
import HeroSection from "../components/landing/HeroSection";
import FeatureCards from "../components/landing/FeatureCards";
import TopContributorsSection from "../components/landing/TopContributorsSection";
import NotifyCTA from "../components/landing/NotifyCTA";
import WhyMedInternia from "../components/landing/WhyMedInternia";
import HowItWorks from "../components/landing/HowItWorks";
import NeedHelpSection from "../components/landing/NeedHelpSection";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-sora",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    // Use auth_status cookie (non-HttpOnly) to detect login without reading JWT
    const isAuth = typeof document !== 'undefined'
      ? document.cookie.split(';').some(c => c.trim().startsWith('auth_status='))
      : false;
    setIsLoggedIn(isAuth);
  }, []);

  return (
    <Box
      component="main"
      className={`${sora.variable} ${ibmPlexMono.variable}`}
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fbff",
        overflowX: "hidden",
        maxWidth: "100%",
      }}
    >
      <SEO
        title="Your Gateway to Medical Learning"
        description="MedInternia is a medical learning and career platform for clinical cases, webinars, internships, collaboration, and healthcare opportunities."
        image="/dashboard-mockup.png"
        path="/"
      />

      <LandingHeader isLoggedIn={isLoggedIn} />
      <HeroSection />
      <FeatureCards isLoggedIn={isLoggedIn} />
      <TopContributorsSection isLoggedIn={isLoggedIn} />
      <NotifyCTA />
      <WhyMedInternia />
      <HowItWorks />
      <NeedHelpSection />
    </Box>
  );
}
