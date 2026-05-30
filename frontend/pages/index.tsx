// removed unused qrcode.react import (caused TypeScript default-export error)
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import React, { useState } from "react";

const categories = ["All", "Cases", "Jobs", "Webinars", "Patients"];
const specialties = [
  "All",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
];
const difficulties = ["Beginner", "Intermediate", "Complex"];
const verifications = ["Verified", "Unverified"];
const sortOptions = ["Newest", "Oldest", "Most Upvoted"];

const HomePage = () => {
  const [toastOpen, setToastOpen] = useState(false);

  const topContributors = [
    { name: "Dr. Smith", points: 320 },
    { name: "Dr. Lee", points: 290 },
    { name: "Dr. Patel", points: 270 },
  ];

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [specialty, setSpecialty] = useState("All");
  const [difficulty, setDifficulty] = useState("");
  const [verification, setVerification] = useState("");
  const [sort, setSort] = useState("Newest");

  const handleToastClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setToastOpen(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e0eafc 0%, #f8f9fa 100%)",
        position: "relative",
        pb: { xs: 4, md: 8 },
      }}
    >
      {/* HERO */}
      <Box
        sx={{
          maxWidth: "100vw",
          mx: 0,
          pt: { xs: 2, md: 4 },
          pb: 2,
          mb: { xs: 2, md: 3 },
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h1"
            fontWeight={900}
            color="#2193b0"
            sx={{ fontSize: { xs: "3.5rem", md: "5rem" } }}
          >
            MedInternia
          </Typography>

          <Typography
            variant="h5"
            color="#555"
            sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" } }}
          >
            Your gateway to medical learning, jobs, and opportunities.
          </Typography>
        </Box>

        <Button
          variant="contained"
          href="/auth/login"
          sx={{
            position: "absolute",
            right: { xs: 16, md: 64 },
            top: { xs: 32, md: 64 },
            borderRadius: 30,
            px: 5,
            py: 1.5,
            fontWeight: 700,
            background: "linear-gradient(90deg, #1de9b6 0%, #2193b0 100%)",
          }}
        >
          Get Started
        </Button>
      </Box>

      {/* VIDEO */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <video
          width="900"
          height="500"
          autoPlay
          loop
          muted
          playsInline
          style={{
            borderRadius: 24,
            boxShadow: "0 8px 32px #2193b066",
            maxWidth: "100%",
          }}
        >
          <source src="/anushka_video.mp4" type="video/mp4" />
        </video>
      </Box>

      {/* CARDS */}
      <Box sx={{ maxWidth: 1100, mx: "auto", px: 2, mb: 6 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <CardLink href="/cases" title="Cases" icon="📂" desc="Medical cases" />
          <CardLink href="/jobs" title="Jobs" icon="💼" desc="Opportunities" />
          <CardLink href="/webinars" title="Webinars" icon="🎤" desc="Live sessions" />
          <CardLink href="/leaderboard" title="Leaderboard" icon="🏆" desc="Top contributors" />
        </Stack>
      </Box>

      {/* 🔥 IMPROVED TOP CONTRIBUTORS SECTION */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          textAlign="center"
          mb={5}
          color="#1565c0"
        >
          🏆 Top Contributors
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 4,
          }}
        >
          {topContributors.map((c, i) => (
            <Paper
              key={i}
              elevation={6}
              sx={{
                p: 4,
                borderRadius: 5,
                textAlign: "center",
                background:
                  "linear-gradient(135deg, #e0f7fa 0%, #e8f0ff 100%)",
                transition: "all 0.3s ease",
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": {
                  transform: "translateY(-10px) scale(1.03)",
                  boxShadow: "0 16px 40px rgba(33,147,176,0.25)",
                },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2193b0, #6dd5ed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                {c.name.charAt(0)}
              </Box>

              <Typography fontWeight={800} color="#1565c0">
                {c.name}
              </Typography>

              <Typography sx={{ color: "#555", fontWeight: 600 }}>
                {c.points} Points
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* FEATURES */}
      <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2} color="#1565c0">
          Why Med-Internia?
        </Typography>

        <ul style={{ fontSize: "1.1rem", marginLeft: "2rem" }}>
          <li>Case-based learning</li>
          <li>Peer review system</li>
          <li>Jobs & webinars</li>
          <li>AI suggestions</li>
        </ul>
      </Box>

      {/* CONTACT */}
      <Box sx={{ maxWidth: 900, mx: "auto", py: 4, textAlign: "center" }}>
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h5" fontWeight={700} color="#1565c0" mb={2}>
            Need Help?
          </Typography>

          <Button
            variant="contained"
            href="/contact"
            sx={{
              borderRadius: 30,
              px: 4,
              fontWeight: 700,
              background:
                "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
            }}
          >
            Contact Us
          </Button>
        </Paper>
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="info" sx={{ fontWeight: 700 }}>
          Login for more info
        </Alert>
      </Snackbar>
    </Box>
  );
};

/* Card Component */
function CardLink({
  href,
  title,
  icon,
  desc,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  desc: string;
}) {
  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        borderRadius: 4,
        textAlign: "center",
        cursor: "pointer",
        "&:hover": { transform: "scale(1.05)" },
      }}
    >
      <Box sx={{ fontSize: 40 }}>{icon}</Box>
      <Typography fontWeight={700} color="#2193b0">
        {title}
      </Typography>
      <Typography variant="body2">{desc}</Typography>
    </Paper>
  );
}

export default HomePage;
