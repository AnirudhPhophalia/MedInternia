"use client";

import { useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  BriefcaseMedical,
  Eye,
  HeartPulse,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

/*
  Fonts: this design pairs "Manrope" (headings) with "Inter" (body copy).
  Add once, e.g. in app/layout.jsx:
    import { Manrope, Inter } from "next/font/google";
    const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
    const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
  ...and spread the variables' className on <body>. Falls back gracefully otherwise.
*/
const FONT_DISPLAY = "'Manrope', 'Inter', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const NAVY = "#062a4a";
const BLUE = "#0072ff";
const TEAL = "#1de9b6";
const CYAN = "#6dd5ed";
const MIST = "#e0eafc";

const journey = [
  {
    icon: BookOpen,
    step: "Learn",
    title: "Case-based learning",
    text: "Work through practical medical cases and sharpen clinical thinking through guided discussions with people who ask the same questions you do.",
  },
  {
    icon: Users,
    step: "Connect",
    title: "Peer collaboration",
    text: "Find students, interns, and mentors who are building the same foundation — and lean on each other while you do it.",
  },
  {
    icon: BriefcaseMedical,
    step: "Advance",
    title: "Career support",
    text: "Discover webinars, jobs, certificates, and learning opportunities in one focused platform built around where you're headed next.",
  },
];

/** Decorative ECG-style pulse line used as the page's signature motif. */
function PulseLine({ color = TEAL, height = 64, animate = true }) {
  const path =
    "M0,32 L110,32 L128,32 L140,8 L156,58 L172,20 L184,32 L340,32 L358,32 L370,10 L386,56 L402,18 L414,32 L560,32 L578,32 L590,8 L606,58 L622,20 L634,32 L790,32 L808,32 L820,10 L836,56 L852,18 L864,32 L1000,32";
  return (
    <Box
      component="svg"
      viewBox="0 0 1000 64"
      preserveAspectRatio="none"
      aria-hidden="true"
      sx={{ width: "100%", height, display: "block" }}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        whileInView={animate ? { pathLength: 1, opacity: 1 } : undefined}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.8, ease: "easeInOut" }}
      />
    </Box>
  );
}
interface FloatIconProps {
  Icon: LucideIcon;
  size: number;
  color: string;
  bg: string;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  delay?: number;
  reduce?: boolean;
}

function FloatIcon({
  Icon,
  size,
  color,
  bg,
  top,
  left,
  right,
  bottom,
  delay = 0,
  reduce,
}: FloatIconProps) {  return (
    <Box
      component={motion.div}
      animate={reduce ? undefined : { y: [0, -10, 0] }}
      transition={reduce ? undefined : { duration: 4.5, delay, repeat: Infinity, ease: "easeInOut" }}
      sx={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 12px 28px rgba(6,42,74,0.18)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Icon size={size * 0.42} color={color} strokeWidth={1.8} />
    </Box>
  );
}

export default function AboutPage() {
  const reduce = useReducedMotion();
  const heroRef = useRef(null);

  return (
    <Box sx={{ flex: 1, background: "#fbfdff", fontFamily: FONT_BODY, overflowX: "clip" }}>
      {/* ---------------------------------------------------------------- HERO */}
      <Box
        ref={heroRef}
        sx={{
          position: "relative",
          pt: { xs: 10, md: 14 },
          pb: { xs: 8, md: 10 },
          overflow: "hidden",
        }}
      >
        {/* ambient gradient blobs */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -180,
            right: -160,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${CYAN}55 0%, transparent 70%)`,
            filter: "blur(10px)",
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            bottom: -220,
            left: -180,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${TEAL}33 0%, transparent 70%)`,
            filter: "blur(10px)",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Grid container spacing={{ xs: 6, md: 4 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <Chip
                  icon={<Sparkles size={16} color={BLUE} />}
                  label="About Us"
                  sx={{
                    bgcolor: "rgba(0,114,255,0.08)",
                    color: BLUE,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    mb: 3,
                    px: 1,
                  }}
                />
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: "-0.02em",
                    fontSize: { xs: "2.6rem", sm: "3.2rem", md: "3.8rem" },
                    color: NAVY,
                  }}
                >
                  Where future clinicians{" "}
                  <Box
                    component="span"
                    sx={{
                      background: `linear-gradient(90deg, ${BLUE} 0%, ${TEAL} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    learn, connect, and grow.
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    mt: 3,
                    color: "#64748b",
                    fontSize: { xs: "1.05rem", md: "1.15rem" },
                    lineHeight: 1.75,
                    maxWidth: 520,
                  }}
                >
                  MedInternia helps medical learners grow through real cases,
                  peer review, career opportunities, and live learning
                  experiences — all in one focused platform.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 5 }} flexWrap="wrap" useFlexGap>
                  <Button
                    component={Link}
                    href="/contact"
                    variant="contained"
                    endIcon={<ArrowRight size={18} />}
                    sx={{
                      borderRadius: 30,
                      px: 4,
                      py: 1.5,
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "1rem",
                      background: `linear-gradient(90deg, ${TEAL} 0%, ${BLUE} 100%)`,
                      boxShadow: "0 14px 30px rgba(0,114,255,0.28)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 18px 36px rgba(0,114,255,0.36)",
                        background: `linear-gradient(90deg, ${TEAL} 0%, ${BLUE} 100%)`,
                      },
                    }}
                  >
                    Contact Us
                  </Button>
                  <Button
                    component={Link}
                    href="#journey"
                    variant="text"
                    sx={{
                      borderRadius: 30,
                      px: 3,
                      py: 1.5,
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "1rem",
                      color: NAVY,
                      "&:hover": { bgcolor: "rgba(6,42,74,0.06)" },
                    }}
                  >
                    See how it works
                  </Button>
                </Stack>
              </motion.div>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              >
                <Box
                  sx={{
                    position: "relative",
                    height: { xs: 320, sm: 380, md: 440 },
                    mx: "auto",
                    maxWidth: 460,
                  }}
                >
                  {/* core glass disc */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: "10%",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.55)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      backdropFilter: "blur(14px)",
                      boxShadow: "0 30px 60px rgba(6,42,74,0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      component={motion.div}
                      animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
                      transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                      sx={{
                        width: "56%",
                        height: "56%",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${CYAN} 0%, ${BLUE} 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 18px 40px rgba(33,147,176,0.35)",
                      }}
                    >
                      <HeartPulse size={64} color="#ffffff" strokeWidth={1.8} />
                    </Box>
                  </Box>

                  <FloatIcon Icon={BookOpen} size={72} color={BLUE} bg="#ffffff" top="2%" left="0%" delay={0} reduce={reduce ?? undefined} />
                  <FloatIcon Icon={Users} size={64} color={BLUE} bg="#ffffff" bottom="6%" left="4%" delay={0.6} reduce={reduce ?? undefined} />
                  <FloatIcon Icon={BriefcaseMedical} size={68} color={BLUE} bg="#ffffff" bottom="0%" right="2%" delay={1.1} reduce={reduce ?? undefined} />

                  <Box
                    aria-hidden="true"
                    sx={{
                      position: "absolute",
                      bottom: -6,
                      left: "8%",
                      right: "8%",
                      opacity: 0.5,
                    }}
                  >
                    <PulseLine color={TEAL} height={40} animate={!reduce} />
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <PulseLine color={MIST} height={40} animate={!reduce} />
      </Container>

      {/* ------------------------------------------------------------- JOURNEY */}
      <Box id="journey" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto", mb: { xs: 6, md: 9 } }}>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: { xs: "2rem", md: "2.6rem" },
                color: NAVY,
                letterSpacing: "-0.01em",
              }}
            >
              A learning path, not a feature list
            </Typography>
            <Typography sx={{ mt: 2, color: "#64748b", fontSize: "1.05rem", lineHeight: 1.7 }}>
              Every part of MedInternia supports the same arc: learn from real
              cases, connect with the people around you, and move your career
              forward.
            </Typography>
          </Box>

          <Box sx={{ position: "relative" }}>
            {/* connecting spine, desktop only */}
            <Box
              aria-hidden="true"
              sx={{
                display: { xs: "none", md: "block" },
                position: "absolute",
                top: 40,
                bottom: 40,
                left: "50%",
                width: "2px",
                transform: "translateX(-50%)",
                background: `linear-gradient(180deg, ${TEAL} 0%, ${BLUE} 100%)`,
                opacity: 0.25,
              }}
            />

            <Stack spacing={{ xs: 6, md: 10 }}>
              {journey.map((item, i) => {
                const Icon = item.icon;
                const reverse = i % 2 === 1;
                return (
                  <motion.div
                    key={item.title}
                    initial={reduce ? false : { opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <Grid
                      container
                      spacing={4}
                      alignItems="center"
                      direction={{ xs: "row", md: reverse ? "row-reverse" : "row" }}
                    >
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Box sx={{ textAlign: { xs: "left", md: reverse ? "left" : "right" } }}>
                          <Typography
                            sx={{
                              fontFamily: FONT_DISPLAY,
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: TEAL,
                              mb: 1,
                            }}
                          >
                            {item.step}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: FONT_DISPLAY,
                              fontWeight: 800,
                              fontSize: { xs: "1.4rem", md: "1.7rem" },
                              color: NAVY,
                              mb: 1.5,
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Typography sx={{ color: "#64748b", lineHeight: 1.75 }}>
                            {item.text}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <Box
                            component={motion.div}
                            whileHover={reduce ? undefined : { rotate: 8, scale: 1.06 }}
                            transition={{ duration: 0.3 }}
                            sx={{
                              width: 84,
                              height: 84,
                              borderRadius: "50%",
                              background: "#ffffff",
                              border: `1px solid rgba(0,114,255,0.14)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 14px 30px rgba(6,42,74,0.12)",
                            }}
                          >
                            <Icon size={32} color={BLUE} strokeWidth={1.8} />
                          </Box>
                        </Box>
                      </Grid>

                      {/* spacer to balance the row on desktop */}
                      <Grid size={{ xs: 0, md: 5 }} sx={{ display: { xs: "none", md: "block" } }} />
                    </Grid>
                  </motion.div>
                );
              })}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* --------------------------------------------------- MISSION & VISION */}
      <Box
        sx={{
          position: "relative",
          py: { xs: 9, md: 12 },
          background: `linear-gradient(135deg, ${NAVY} 0%, #0a3d63 55%, ${BLUE} 130%)`,
          overflow: "hidden",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -140,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${TEAL}22 0%, transparent 70%)`,
            filter: "blur(4px)",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Grid container spacing={4}>
            {[
              {
                icon: Target,
                label: "Our Mission",
                text: "To give every medical learner a focused place to practice clinical thinking, learn from real cases, and grow with people on the same path.",
              },
              {
                icon: Eye,
                label: "Our Vision",
                text: "A future where the transition from student to clinician is guided by community, not navigated alone — supported at every stage.",
              },
            ].map((block, i) => {
              const Icon = block.icon;
              return (
                <Grid size={{ xs: 12, md: 6 }} key={block.label}>
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
                    style={{ height: "100%" }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        p: { xs: 4, md: 5 },
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        backdropFilter: "blur(14px)",
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `linear-gradient(135deg, ${TEAL} 0%, ${CYAN} 100%)`,
                          mb: 3,
                        }}
                      >
                        <Icon size={26} color={NAVY} strokeWidth={2} />
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 800,
                          fontSize: "1.5rem",
                          color: "#ffffff",
                          mb: 1.5,
                        }}
                      >
                        {block.label}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.8 }}>
                        {block.text}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* --------------------------------------------------------------- CTA */}
      <Box sx={{ py: { xs: 9, md: 12 } }}>
        <Container maxWidth="lg">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                textAlign: "center",
                px: { xs: 4, md: 8 },
                py: { xs: 6, md: 8 },
                borderRadius: 6,
                overflow: "hidden",
                background: `linear-gradient(120deg, ${MIST} 0%, #ffffff 60%)`,
                border: "1px solid rgba(0,114,255,0.12)",
                boxShadow: "0 24px 60px rgba(6,42,74,0.12)",
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top: -80,
                  right: -80,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${TEAL}33 0%, transparent 70%)`,
                }}
              />
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: { xs: "1.9rem", md: "2.4rem" },
                  color: NAVY,
                  letterSpacing: "-0.01em",
                  position: "relative",
                }}
              >
                Ready to learn alongside people who get it?
              </Typography>
              <Typography
                sx={{
                  mt: 2,
                  color: "#64748b",
                  fontSize: "1.05rem",
                  maxWidth: 520,
                  mx: "auto",
                  position: "relative",
                }}
              >
                Reach out and we'll help you find the right place to start on
                MedInternia.
              </Typography>
              <Button
                component={Link}
                href="/contact"
                variant="contained"
                endIcon={<ArrowRight size={18} />}
                sx={{
                  mt: 4,
                  position: "relative",
                  borderRadius: 30,
                  px: 4.5,
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "1rem",
                  background: `linear-gradient(90deg, ${TEAL} 0%, ${BLUE} 100%)`,
                  boxShadow: "0 14px 30px rgba(0,114,255,0.28)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 18px 36px rgba(0,114,255,0.36)",
                    background: `linear-gradient(90deg, ${TEAL} 0%, ${BLUE} 100%)`,
                  },
                }}
              >
                Contact Us
              </Button>
            </Paper>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
}