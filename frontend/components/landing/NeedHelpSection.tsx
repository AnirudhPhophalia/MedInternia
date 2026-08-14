import React from 'react';
import { useRouter } from 'next/router';
import { motion, Variants } from 'framer-motion';
import { Container, Paper, Box, Typography, Button } from '@mui/material';
import { HeadphonesIcon } from 'lucide-react';

export default function NeedHelpSection() {
  const router = useRouter();

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 10, mb: 10 }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 5 },
            borderRadius: '24px',
            background: 'linear-gradient(to right, #f0fdf4, #f8fafc)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            border: '1px solid #e2e8f0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #34d399, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HeadphonesIcon size={36} color="#fff" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" mb={1}>
                Need Help or Have Questions?
              </Typography>
              <Typography color="#475569">Reach out to the MedInternia team for support and inquiries.</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            sx={{
              bgcolor: '#0072ff',
              borderRadius: '10px',
              px: 5,
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#0056cc' },
            }}
            onClick={() => router.push('/contact')}
          >
            Contact Us
          </Button>
        </Paper>
      </motion.div>
    </Container>
  );
}
