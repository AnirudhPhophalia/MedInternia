import { useMemo } from "react";
import { Box, Container, Paper, Stack, Typography, IconButton, Button } from "@mui/material";
import {
  ShieldCheck,
  Database,
  UserRound,
  Mail,
  X,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/router";
import { motion, useReducedMotion, type Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const sections = [
  {
    title: "Information We Collect",
    text: "MedInternia may collect account details, profile information, learning activity, and content you choose to submit on the platform.",
    icon: Database,
    accent: "#0072ff",
  },
  {
    title: "How We Use Information",
    text: "Information is used to provide platform features, improve learning experiences, manage user access, and support communication.",
    icon: UserRound,
    accent: "#0891b2",
  },
  {
    title: "Data Protection",
    text: "We aim to protect user information with reasonable safeguards and encourage responsible platform usage.",
    icon: ShieldCheck,
    accent: "#2563eb",
  },
  {
    title: "Contact",
    text: "For privacy-related questions, contact the team through the Contact page or at medinternia@gmail.com.",
    icon: Mail,
    accent: "#06b6d4",
  },
] as const;

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

const heroVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardListVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ---------------------------------------------------------------------------
// Decorative background: blurred gradient blobs + dot grid
// ---------------------------------------------------------------------------

function AmbientBackground({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {/* dot grid */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(15, 76, 129, 0.14) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
        }}
      />

      <MotionBox
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: -120,
          left: -100,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,114,255,0.35) 0%, rgba(0,114,255,0) 70%)",
          filter: "blur(10px)",
        }}
      />

      <MotionBox
        animate={
          reduceMotion
            ? undefined
            : { x: [0, -30, 25, 0], y: [0, 25, -25, 0] }
        }
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: 120,
          right: -140,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.30) 0%, rgba(6,182,212,0) 70%)",
          filter: "blur(10px)",
        }}
      />

      <MotionBox
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 20, -20, 0], y: [0, -20, 15, 0] }
        }
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          bottom: -160,
          left: "35%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0) 70%)",
          filter: "blur(10px)",
        }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  text,
  icon: Icon,
  accent,
}: (typeof sections)[number]) {
  return (
    <MotionBox
      variants={cardVariants}
      whileHover={{ y: -6, scale: 1.012 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        position: "relative",
        p: { xs: 2.75, md: 3.5 },
        borderRadius: "18px",
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(15,76,129,0.10)",
        borderLeft: `3px solid ${accent}`,
        boxShadow: "0 4px 18px rgba(15,76,129,0.06)",
        overflow: "hidden",
        transition: "box-shadow 0.35s ease, border-color 0.35s ease",
        "&:hover": {
          boxShadow: `0 18px 40px -12px ${accent}55`,
          borderColor: `${accent}55`,
        },
        "&:hover .section-icon-wrap": {
          transform: "scale(1.08) rotate(-4deg)",
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          className="section-icon-wrap"
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${accent}22, ${accent}0d)`,
            boxShadow: `0 0 0 1px ${accent}26, 0 6px 16px ${accent}22`,
            transition: "transform 0.35s ease",
          }}
        >
          <Icon size={20} color={accent} strokeWidth={2.2} />
        </Box>

        <Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 0.75, color: "#0f2942", letterSpacing: "-0.01em" }}
          >
            {title}
          </Typography>
          <Typography
            sx={{ color: "text.secondary", lineHeight: 1.75, fontSize: "0.975rem" }}
          >
            {text}
          </Typography>
        </Box>
      </Stack>
    </MotionBox>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PrivacyPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = useMemo(() => Boolean(prefersReducedMotion), [prefersReducedMotion]);

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #eef5ff 0%, #f7fafd 45%, #eefcff 100%)",
        py: { xs: 8, md: 12 },
      }}
    >
      <AmbientBackground reduceMotion={reduceMotion} />

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <MotionBox
          initial="hidden"
          animate="show"
          variants={heroVariants}
          sx={{ textAlign: "center", mb: { xs: 5, md: 7 } }}
        >
          <MotionBox
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            sx={{
              width: 88,
              height: 88,
              mx: "auto",
              mb: 3,
              borderRadius: "24px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #0072ff 0%, #06b6d4 100%)",
              boxShadow: "0 16px 40px -10px rgba(0,114,255,0.45)",
            }}
          >
            <ShieldCheck size={44} color="#fff" strokeWidth={2} />
          </MotionBox>

          <Typography
            variant="h2"
            fontWeight={900}
            sx={{
              fontSize: { xs: "2.4rem", md: "3.75rem" },
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              background: "linear-gradient(90deg, #0072ff 0%, #0891b2 60%, #06b6d4 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Privacy Policy
          </Typography>

          <Typography
            sx={{
              color: "text.secondary",
              maxWidth: 520,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.075rem" },
              lineHeight: 1.7,
            }}
          >
            Your privacy and the security of your data matter to us. Here's a
            clear look at how MedInternia handles your information.
          </Typography>
        </MotionBox>

        {/* ---------------------------------------------------------------- */}
        {/* Main card                                                        */}
        {/* ---------------------------------------------------------------- */}
        <MotionPaper
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          whileHover={{ y: -2 }}
          elevation={0}
          sx={{
            position: "relative",
            p: { xs: 3, md: 5.5 },
            borderRadius: "26px",
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow:
              "0 24px 70px -20px rgba(15,76,129,0.22), inset 0 1px 0 rgba(255,255,255,0.5)",
            transition: "box-shadow 0.4s ease",
            "&:hover": {
              boxShadow:
                "0 30px 80px -18px rgba(15,76,129,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
            },
          }}
        >
          <IconButton
            onClick={() => router.back()}
            aria-label="Close privacy policy"
            component={motion.button}
            whileHover={reduceMotion ? undefined : { rotate: 90, scale: 1.05 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              position: "absolute",
              top: { xs: 14, md: 20 },
              right: { xs: 14, md: 20 },
              color: "text.secondary",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(15,76,129,0.10)",
              boxShadow: "0 4px 14px rgba(15,76,129,0.10)",
              "&:hover": {
                color: "#0072ff",
                backgroundColor: "rgba(0,114,255,0.10)",
              },
            }}
          >
            <X size={20} />
          </IconButton>

          <Box
            sx={{
              width: 56,
              height: 3,
              borderRadius: "999px",
              background: "linear-gradient(90deg, #0072ff, #06b6d4)",
              mb: 3,
            }}
          />

          <Typography
            sx={{
              color: "text.secondary",
              mb: 4.5,
              lineHeight: 1.75,
              maxWidth: 640,
              fontSize: "1.02rem",
            }}
          >
            This page explains how MedInternia handles user information and
            platform data.
          </Typography>

          <MotionBox
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardListVariants}
            sx={{ display: "grid", gap: 2.5 }}
          >
            {sections.map((section) => (
              <SectionCard key={section.title} {...section} />
            ))}
          </MotionBox>

          {/* ------------------------------------------------------------ */}
          {/* Footer CTA                                                    */}
          {/* ------------------------------------------------------------ */}
          <Box
            sx={{
              mt: { xs: 4.5, md: 5.5 },
              pt: { xs: 4, md: 4.5 },
              borderTop: "1px solid rgba(15,76,129,0.10)",
            }}
          >
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: "20px",
                background:
                  "linear-gradient(120deg, rgba(0,114,255,0.08) 0%, rgba(6,182,212,0.08) 100%)",
                border: "1px solid rgba(0,114,255,0.12)",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2.5,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 42,
                    height: 42,
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #0072ff, #06b6d4)",
                    boxShadow: "0 8px 20px -6px rgba(0,114,255,0.5)",
                  }}
                >
                  <Sparkles size={20} color="#fff" />
                </Box>
                <Typography
                  sx={{
                    color: "#0f2942",
                    fontWeight: 600,
                    lineHeight: 1.65,
                    maxWidth: 420,
                  }}
                >
                  We're committed to protecting your information and being
                  transparent about how we use it.
                </Typography>
              </Stack>

              <Button
                onClick={() => router.push("/contact")}
                variant="contained"
                disableElevation
                endIcon={<ArrowUpRight size={18} />}
                sx={{
                  flexShrink: 0,
                  px: 3,
                  py: 1.2,
                  borderRadius: "12px",
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  background: "linear-gradient(90deg, #0072ff, #0891b2)",
                  boxShadow: "0 10px 24px -8px rgba(0,114,255,0.5)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  "&:hover": {
                    background: "linear-gradient(90deg, #0072ff, #0891b2)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 14px 30px -8px rgba(0,114,255,0.6)",
                  },
                }}
              >
                Contact Us
              </Button>
            </Box>
          </Box>
        </MotionPaper>
      </Container>
    </Box>
  );
}