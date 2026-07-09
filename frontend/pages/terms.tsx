import { useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import {
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  Ban,
  Stethoscope,
  RefreshCcw,
  X,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/router";
import { motion, useReducedMotion, type Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Content — unchanged from the original, only the icon element is swapped
// for a component reference so it can be styled inside the new card shell.
// ---------------------------------------------------------------------------

const sections = [
  {
    title: "Acceptable Use",
    icon: UserCheck,
    accent: "#0072ff",
    description:
      "Use MedInternia respectfully and only for learning, collaboration, networking, and professional development. Users are expected to maintain professionalism while interacting with others.",
  },
  {
    title: "Prohibited Activities",
    icon: Ban,
    accent: "#7c3aed",
    description:
      "Do not upload harmful, misleading, offensive, illegal, or unauthorized content. Any misuse of the platform may result in account suspension or permanent removal.",
  },
  {
    title: "Community Guidelines",
    icon: ShieldCheck,
    accent: "#0891b2",
    description:
      "Respect fellow learners, mentors, healthcare professionals, and contributors. Harassment, discrimination, or abusive behavior is not tolerated.",
  },
  {
    title: "Medical Disclaimer",
    icon: Stethoscope,
    accent: "#2563eb",
    description:
      "Content available on MedInternia is intended for educational purposes only and should never replace professional medical advice, diagnosis, or treatment.",
  },
  {
    title: "Updates to These Terms",
    icon: RefreshCcw,
    accent: "#8b5cf6",
    description:
      "These Terms of Service may be updated periodically to reflect improvements, legal requirements, or platform changes. Continued use of the platform constitutes acceptance of the revised terms.",
  },
] as const;

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// ---------------------------------------------------------------------------
// Layered background: gradient wash, blurred blue/purple blobs, dot grid,
// drifting particles.
// ---------------------------------------------------------------------------

function AmbientBackground({ reduceMotion }: { reduceMotion: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        size: 3 + ((i * 7) % 5),
        duration: 14 + ((i * 5) % 10),
        delay: (i % 5) * 0.6,
      })),
    []
  );

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
            "radial-gradient(rgba(45,55,120,0.14) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 85% 65% at 50% 15%, black 35%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 65% at 50% 15%, black 35%, transparent 100%)",
        }}
      />

      {/* blue blob */}
      <MotionBox
        animate={reduceMotion ? undefined : { x: [0, 44, -18, 0], y: [0, -28, 22, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: -140,
          left: -110,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,114,255,0.32) 0%, rgba(0,114,255,0) 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* purple blob */}
      <MotionBox
        animate={reduceMotion ? undefined : { x: [0, -34, 26, 0], y: [0, 24, -24, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: 100,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.26) 0%, rgba(124,58,237,0) 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* cyan blob */}
      <MotionBox
        animate={reduceMotion ? undefined : { x: [0, 22, -22, 0], y: [0, -18, 18, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          bottom: -180,
          left: "32%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(8,145,178,0.22) 0%, rgba(8,145,178,0) 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* floating particles */}
      {!reduceMotion &&
        particles.map((p) => (
          <MotionBox
            key={p.id}
            animate={{ y: [0, -18, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
            sx={{
              position: "absolute",
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(0,114,255,0.55), rgba(124,58,237,0.55))",
            }}
          />
        ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  icon: Icon,
  accent,
}: (typeof sections)[number]) {
  return (
    <MotionBox
      variants={cardItem}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        position: "relative",
        p: { xs: 3, md: 3.75 },
        borderRadius: "20px",
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(30,41,90,0.10)",
        boxShadow: "0 4px 20px rgba(30,41,90,0.06)",
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        "&:hover": {
          boxShadow: `0 20px 44px -14px ${accent}55`,
          borderColor: `${accent}55`,
        },
        "&:hover .accent-line": { height: "100%" },
        "&:hover .card-icon-wrap": { transform: "scale(1.1) rotate(-6deg)" },
      }}
    >
      <Box
        className="accent-line"
        sx={{
          position: "absolute",
          left: 0,
          top: "18%",
          width: 3,
          height: "64%",
          borderRadius: "999px",
          background: accent,
          transition: "height 0.3s ease, top 0.3s ease",
        }}
      />

      <Stack direction="row" spacing={2.25} alignItems="flex-start" sx={{ pl: 1 }}>
        <Box
          className="card-icon-wrap"
          sx={{
            flexShrink: 0,
            width: 46,
            height: 46,
            borderRadius: "13px",
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${accent}26, ${accent}0d)`,
            boxShadow: `0 0 0 1px ${accent}26, 0 8px 18px ${accent}22`,
            transition: "transform 0.3s ease",
          }}
        >
          <Icon size={22} color={accent} strokeWidth={2.2} />
        </Box>

        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ mb: 1, color: "#111b3d", letterSpacing: "-0.01em" }}
          >
            {title}
          </Typography>
          <Typography
            sx={{ color: "text.secondary", lineHeight: 1.9, fontSize: "1rem" }}
          >
            {description}
          </Typography>
        </Box>
      </Stack>
    </MotionBox>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TermsPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = useMemo(() => Boolean(prefersReducedMotion), [prefersReducedMotion]);

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        background: "linear-gradient(135deg, #eef3ff 0%, #f8f9fc 45%, #f2effd 100%)",
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
          variants={heroContainer}
          sx={{ textAlign: "center", mb: { xs: 5, md: 7 } }}
        >
          <MotionBox
            variants={heroItem}
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
              background: "linear-gradient(135deg, #0072ff 0%, #7c3aed 100%)",
              boxShadow: "0 16px 40px -10px rgba(76,29,220,0.4)",
            }}
          >
            <ClipboardCheck size={44} color="#fff" strokeWidth={2} />
          </MotionBox>

          <MotionBox variants={heroItem} sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                px: 2,
                py: 0.75,
                borderRadius: "999px",
                background: "rgba(0,114,255,0.08)",
                border: "1px solid rgba(0,114,255,0.18)",
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#0072ff",
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#0072ff",
                  letterSpacing: "0.02em",
                }}
              >
                Legal • Updated June 2026
              </Typography>
            </Stack>
          </MotionBox>

          <Typography
            component={motion.h1}
            variants={heroItem}
            variant="h2"
            fontWeight={900}
            sx={{
              fontSize: { xs: "2.4rem", md: "3.75rem" },
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              background: "linear-gradient(90deg, #0072ff 0%, #6d28d9 60%, #0891b2 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Terms of Service
          </Typography>

          <Typography
            component={motion.p}
            variants={heroItem}
            sx={{
              color: "text.secondary",
              maxWidth: 560,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.075rem" },
              lineHeight: 1.8,
            }}
          >
            Please read these Terms of Service carefully before using
            MedInternia. By accessing or using the platform, you agree to
            comply with these terms and help maintain a safe, professional,
            and collaborative learning environment.
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
            borderRadius: "28px",
            background: "rgba(255,255,255,0.68)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow:
              "0 24px 70px -20px rgba(30,41,90,0.22), inset 0 1px 0 rgba(255,255,255,0.5)",
            transition: "box-shadow 0.4s ease",
            "&:hover": {
              boxShadow:
                "0 30px 80px -18px rgba(30,41,90,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
            },
          }}
        >
          <IconButton
            onClick={() => router.back()}
            aria-label="Close terms of service"
            component={motion.button}
            whileHover={reduceMotion ? undefined : { rotate: 90, scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              position: "absolute",
              top: { xs: 14, md: 20 },
              right: { xs: 14, md: 20 },
              color: "text.secondary",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(30,41,90,0.10)",
              boxShadow: "0 4px 14px rgba(30,41,90,0.10)",
              transition: "color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease",
              "&:hover": {
                color: "#0072ff",
                backgroundColor: "rgba(0,114,255,0.10)",
                boxShadow: "0 6px 20px rgba(0,114,255,0.25)",
              },
            }}
          >
            <X size={20} />
          </IconButton>

          {/* Sections */}
          <MotionBox
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={listContainer}
            sx={{ display: "grid", gap: 2.75 }}
          >
            {sections.map((section) => (
              <SectionCard key={section.title} {...section} />
            ))}
          </MotionBox>

          {/* ------------------------------------------------------------ */}
          {/* Footer                                                        */}
          {/* ------------------------------------------------------------ */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              mt: { xs: 4.5, md: 5.5 },
              pt: { xs: 4, md: 4.5 },
              borderTop: "1px solid rgba(30,41,90,0.10)",
              textAlign: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{
                mx: "auto",
                width: "fit-content",
                px: 2.5,
                py: 1,
                borderRadius: "999px",
                background:
                  "linear-gradient(120deg, rgba(0,114,255,0.08), rgba(124,58,237,0.08))",
                border: "1px solid rgba(30,41,90,0.10)",
              }}
            >
              <CheckCircle2 size={16} color="#0072ff" />
              <Typography
                sx={{ fontSize: "0.9rem", color: "text.secondary", fontWeight: 600 }}
              >
                <Box component="span" sx={{ color: "#0f2942", fontWeight: 800 }}>
                  Last Updated
                </Box>{" "}
                — June 2026
              </Typography>
            </Stack>
          </Box>
        </MotionPaper>
      </Container>
    </Box>
  );
}