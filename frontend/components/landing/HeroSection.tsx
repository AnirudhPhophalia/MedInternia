import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  motion,
  Variants,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import { Box, Typography, Button, Paper, Stack, Container, Grid } from '@mui/material';
import { FolderOpen, ChevronRight, Users, Activity, ShieldCheck } from 'lucide-react';

const fontDisplay = "var(--font-sora), 'Inter', sans-serif";
const fontMono = "var(--font-ibm-plex-mono), monospace";

const HERO_HEADLINE_WORDS = [
  'Medical Learning',
  'Clinical Cases',
  'Medical Careers',
  'Healthcare Opportunities',
];

const HERO_PARTICLES: { top: string; left: string; size: number; duration: number; delay: number }[] = [
  { top: '12%', left: '8%', size: 6, duration: 7, delay: 0 },
  { top: '22%', left: '84%', size: 4, duration: 9, delay: 1.2 },
  { top: '68%', left: '14%', size: 5, duration: 8, delay: 0.6 },
  { top: '78%', left: '70%', size: 7, duration: 10, delay: 2 },
  { top: '40%', left: '92%', size: 4, duration: 6.5, delay: 1.8 },
  { top: '58%', left: '4%', size: 5, duration: 8.5, delay: 0.3 },
  { top: '85%', left: '46%', size: 4, duration: 7.5, delay: 2.4 },
  { top: '6%', left: '55%', size: 5, duration: 9.5, delay: 1 },
  { top: '30%', left: '36%', size: 3, duration: 6, delay: 0.9 },
];

function LiveDot({ color = '#00c853', size = 8 }: { color?: string; size?: number }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.35, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }}
    />
  );
}

function TypewriterText({ words }: { words: string[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [animationEnabled, setAnimationEnabled] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [subIndex, setSubIndex] = React.useState(words[0]?.length ?? 0);
  const [deleting, setDeleting] = React.useState(false);
  const [blink, setBlink] = React.useState(true);

  React.useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = window.setTimeout(() => setAnimationEnabled(true), 6500);
    return () => window.clearTimeout(timer);
  }, [shouldReduceMotion]);

  React.useEffect(() => {
    if (shouldReduceMotion || !animationEnabled) return;
    const current = words[index];

    if (!deleting && subIndex === current.length) {
      const holdTimeout = setTimeout(() => setDeleting(true), 1500);
      return () => clearTimeout(holdTimeout);
    }

    if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const typeTimeout = setTimeout(
      () => setSubIndex((prev) => prev + (deleting ? -1 : 1)),
      deleting ? 35 : 65,
    );

    return () => clearTimeout(typeTimeout);
  }, [subIndex, deleting, index, words, shouldReduceMotion, animationEnabled]);

  React.useEffect(() => {
    const blinkInterval = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearInterval(blinkInterval);
  }, []);

  const displayText =
    shouldReduceMotion || !animationEnabled
      ? words[0]
      : words[index].substring(0, subIndex);

  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline" }}>
      <motion.span
        style={{
          backgroundImage: "linear-gradient(90deg, #0072ff, #00c6ff, #4facfe, #00c6ff, #0072ff)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          fontFamily: fontDisplay,
        }}
        animate={
          shouldReduceMotion || !animationEnabled
            ? undefined
            : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        {displayText}
      </motion.span>
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          display: "inline-block",
          width: "3px",
          ml: "2px",
          alignSelf: "stretch",
          bgcolor: "#0072ff",
          opacity: blink ? 1 : 0,
          transition: "opacity 0.1s",
        }}
      />
    </Box>
  );
}

function HeroBackground({
  parallaxX,
  parallaxY,
}: {
  parallaxX: ReturnType<typeof useTransform<number, number>>;
  parallaxY: ReturnType<typeof useTransform<number, number>>;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 15% 10%, rgba(0,114,255,0.07), transparent 55%)' }} />
      <motion.div
        style={{
          position: 'absolute',
          top: '-8%',
          left: '-6%',
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,114,255,0.20), transparent 70%)',
          filter: 'blur(30px)',
          x: parallaxX,
          y: parallaxY,
        }}
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          bottom: '-12%',
          right: '-8%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,198,255,0.16), transparent 70%)',
          filter: 'blur(36px)',
          x: parallaxX,
          y: parallaxY,
        }}
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      />
      {HERO_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#0072ff',
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.15 }
              : { y: [0, -18, 0], opacity: [0.08, 0.28, 0.08] }
          }
          transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
        />
      ))}
      {!shouldReduceMotion && (
        <motion.svg
          width="360"
          height="60"
          viewBox="0 0 360 60"
          style={{ position: 'absolute', top: '42%', opacity: 0.09 }}
          animate={{ x: ['-20%', '120%'] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        >
          <path
            d="M0 30 H90 L104 8 L122 52 L138 30 H210 L222 14 L236 46 L250 30 H360"
            stroke="#0072ff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.svg>
      )}
    </Box>
  );
}

function FloatingCard({
  icon,
  eyebrow,
  label,
  accent,
  sx,
  floatDelay = 0,
  parallaxX,
  parallaxY,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  label: string;
  accent: string;
  sx: object;
  floatDelay?: number;
  parallaxX: ReturnType<typeof useTransform<number, number>>;
  parallaxY: ReturnType<typeof useTransform<number, number>>;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      style={{ position: 'absolute', zIndex: 3, x: parallaxX, y: parallaxY, ...sx }}
      initial={{ opacity: 0, y: 12 }}
      animate={
        shouldReduceMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 1, y: [0, -10, 0] }
      }
      transition={{
        opacity: { duration: 0.5, delay: floatDelay },
        y: shouldReduceMotion
          ? { duration: 0.5, delay: floatDelay }
          : { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: floatDelay },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          py: 1.25,
          px: 2,
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          bgcolor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderLeft: `3px solid ${accent}`,
          boxShadow: '0 12px 28px rgba(10,37,64,0.14)',
        }}
      >
        {icon}
        <Box>
          <Typography
            sx={{
              fontFamily: fontMono,
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
          <Typography variant="body2" fontWeight={700} color="#0a2540" sx={{ whiteSpace: 'nowrap' }}>
            {label}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
}

function GlowRippleButton({
  children,
  onClick,
  sx,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  sx?: object;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
    onClick?.();
  };

  return (
    <motion.div
      animate={
        shouldReduceMotion
          ? undefined
          : {
            boxShadow: [
              '0 10px 24px rgba(0,114,255,0.28)',
              '0 16px 40px rgba(0,114,255,0.48)',
              '0 10px 24px rgba(0,114,255,0.28)',
            ],
            scale: [1, 1.02, 1],
          }
      }
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
      style={{ borderRadius: '14px', display: 'inline-block' }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
    >
      <Button
        variant="contained"
        size="large"
        onClick={handleClick}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#0072ff',
          px: 4.5,
          py: 1.4,
          borderRadius: '14px',
          fontWeight: 700,
          textTransform: 'none',
          fontSize: '1rem',
          '&:hover': { bgcolor: '#005bd6' },
          ...sx,
        }}
      >
        {children}
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ width: 0, height: 0, opacity: 0.45 }}
            animate={{ width: 260, height: 260, opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              x: '-50%',
              y: '-50%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </Button>
    </motion.div>
  );
}

export default function HeroSection() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20, mass: 0.4 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20, mass: 0.4 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleHeroMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const bgParallaxX = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const bgParallaxY = useTransform(springY, [-0.5, 0.5], [-18, 18]);
  const textParallaxX = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const textParallaxY = useTransform(springY, [-0.5, 0.5], [-8, 8]);
  const videoParallaxX = useTransform(springX, [-0.5, 0.5], [-12, 12]);
  const videoParallaxY = useTransform(springY, [-0.5, 0.5], [-12, 12]);
  const cardParallaxX = useTransform(springX, [-0.5, 0.5], [-16, 16]);
  const cardParallaxY = useTransform(springY, [-0.5, 0.5], [-16, 16]);
  const cardParallaxXInv = useTransform(springX, [-0.5, 0.5], [16, -16]);
  const cardParallaxYInv = useTransform(springY, [-0.5, 0.5], [16, -16]);

  return (
    <Box
      ref={heroRef}
      onMouseMove={handleHeroMouseMove}
      onMouseLeave={handleHeroMouseLeave}
      sx={{ position: 'relative', overflow: 'hidden' }}
    >
      <HeroBackground parallaxX={bgParallaxX} parallaxY={bgParallaxY} />

      <Container maxWidth="xl" sx={{ pt: { xs: 6, md: 12 }, pb: { xs: 8, md: 12 }, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
              <motion.div
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 3 }}>
                  <LiveDot />
                  <Typography
                    sx={{
                      fontFamily: fontMono,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      color: '#0072ff',
                      textTransform: 'uppercase',
                    }}
                  >
                    Medical Learning Network
                  </Typography>
                </Stack>
              </motion.div>

              <motion.div style={{ x: textParallaxX, y: textParallaxY }} variants={fadeInUp}>
                <Typography
                  variant="h1"
                  sx={{
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.7rem' },
                    color: '#0a2540',
                    lineHeight: 1.14,
                    letterSpacing: '-0.01em',
                    mb: 3,
                    minHeight: { xs: '7.5rem', sm: '8.5rem', md: '8.8rem' },
                  }}
                >
                  Your gateway to
                  <br />
                  <TypewriterText words={HERO_HEADLINE_WORDS} />
                </Typography>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Typography variant="body1" sx={{ color: '#4a5568', fontSize: '1.1rem', mb: 4, maxWidth: 480, lineHeight: 1.65 }}>
                  Join a community of learners and professionals collaborating to shape the future of healthcare.
                </Typography>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 5 }}>
                  <GlowRippleButton onClick={() => router.push('/auth/register')}>Join now</GlowRippleButton>
                  <Button
                    variant="text"
                    size="large"
                    endIcon={
                      <Box className="hero-arrow" sx={{ display: 'inline-flex', transition: 'transform 0.25s ease' }}>
                        <ChevronRight size={18} />
                      </Box>
                    }
                    sx={{
                      color: '#0a2540',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '1rem',
                      px: 2,
                      '&:hover': { bgcolor: 'transparent', color: '#0072ff' },
                      '&:hover .hero-arrow': { transform: 'translateX(4px)' },
                    }}
                    onClick={() => router.push('/auth/login')}
                  >
                    Log in
                  </Button>
                </Box>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.75, ease: 'easeOut' }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Activity size={19} color="#0072ff" aria-hidden />
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Users size={15} color="#0072ff" aria-hidden />
                      <Typography fontWeight={700} color="#0a2540" fontSize="0.92rem">
                        Growing community
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{ color: '#718096', fontFamily: fontMono, letterSpacing: '0.02em', fontSize: '0.72rem' }}
                    >
                      Doctors · interns · students
                    </Typography>
                  </Box>
                </Stack>
              </motion.div>
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
            >
              <Box sx={{ position: 'relative', px: { xs: 1, sm: 2 }, py: 2 }}>
                <Box
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    inset: { xs: 18, sm: 28 },
                    borderRadius: '32px',
                    backgroundImage:
                      'linear-gradient(rgba(0,114,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,114,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                    zIndex: 0,
                  }}
                />

                <motion.div
                  style={{ x: videoParallaxX, y: videoParallaxY }}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.015, rotate: 0.4 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      maxWidth: 540,
                      mx: 'auto',
                      p: '2px',
                      borderRadius: '30px',
                      background: 'linear-gradient(135deg, rgba(0,114,255,0.65), rgba(0,198,255,0.35), rgba(79,172,254,0.65))',
                      boxShadow: '0 24px 56px rgba(10, 37, 64, 0.2)',
                      transition: 'box-shadow 0.35s ease',
                      '&:hover': { boxShadow: '0 30px 70px rgba(0,114,255,0.34)' },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: '28px',
                        overflow: 'hidden',
                        bgcolor: '#000',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      <Image
                        src="/anushka-video-poster.webp"
                        alt="Preview of the MedInternia learning dashboard"
                        width={900}
                        height={506}
                        priority
                        sizes="(max-width: 900px) 100vw, 50vw"
                        style={{
                          display: "block",
                          width: "100%",
                          height: "auto",
                          aspectRatio: "16 / 9",
                          objectFit: "cover",
                        }}
                      />
                      {!shouldReduceMotion && (
                        <motion.div
                          aria-hidden="true"
                          initial={{ x: '-150%' }}
                          animate={{ x: '150%' }}
                          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '40%',
                            height: '100%',
                            background:
                              'linear-gradient(105deg, transparent, rgba(255,255,255,0.22), transparent)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </motion.div>

                <FloatingCard
                  icon={<LiveDot />}
                  eyebrow="Live Now"
                  label="Expert AMA sessions"
                  accent="#00c853"
                  floatDelay={0.7}
                  parallaxX={cardParallaxX}
                  parallaxY={cardParallaxY}
                  sx={{ top: -10, right: 16, display: { xs: 'none', sm: 'block' } }}
                />

                <FloatingCard
                  icon={
                    <Box sx={{ bgcolor: '#eff6ff', p: 1, borderRadius: '10px', display: 'flex' }}>
                      <FolderOpen size={20} color="#0072ff" />
                    </Box>
                  }
                  eyebrow="Case Library"
                  label="Peer-reviewed cases"
                  accent="#0072ff"
                  floatDelay={0.9}
                  parallaxX={cardParallaxXInv}
                  parallaxY={cardParallaxYInv}
                  sx={{ bottom: -10, left: 16 }}
                />

                <FloatingCard
                  icon={
                    <Box sx={{ bgcolor: '#f0fdf4', p: 1, borderRadius: '10px', display: 'flex' }}>
                      <ShieldCheck size={20} color="#16a34a" />
                    </Box>
                  }
                  eyebrow="Verified"
                  label="Trusted community"
                  accent="#16a34a"
                  floatDelay={1.3}
                  parallaxX={cardParallaxXInv}
                  parallaxY={cardParallaxY}
                  sx={{ top: '38%', right: -18, display: { xs: 'none', md: 'block' } }}
                />
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
