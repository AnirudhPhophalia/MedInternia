import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../../utils/api';
import PageHeader from '../../../components/layout/PageHeader';
import Link from 'next/link';

export default function CollectionsDashboard() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const res = await api.get('/collections/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCollections(res.data.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, [router]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #f8fbff 0%, #e8f4ff 100%)', py: 6 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/profile/me"
          sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
        >
          Back to Profile
        </Button>

        <PageHeader 
          title="Saved Collections" 
          subtitle="Organize your bookmarked cases into custom folders for easy studying and future reference."
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Profile', href: '/profile/me' }, { label: 'Collections' }]}
        />

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {collections.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.8)' }}>
                  <FolderIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    You haven't created any collections yet.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    Find an interesting case on the platform and click the "Save" button to start bookmarking!
                  </Typography>
                  <Button variant="contained" component={Link} href="/cases" sx={{ borderRadius: 2 }}>
                    Browse Cases
                  </Button>
                </Card>
              </Grid>
            ) : (
              collections.map((collection) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={collection._id}>
                  <Card 
                    sx={{ 
                      borderRadius: 4, 
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' } 
                    }}
                    onClick={() => router.push(`/profile/collections/${collection._id}`)}
                  >
                    <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <Box sx={{ 
                        width: 80, height: 80, borderRadius: '20px', 
                        bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mb: 2, color: 'primary.main'
                      }}>
                        <FolderIcon sx={{ fontSize: 40 }} />
                      </Box>
                      <Typography variant="h6" fontWeight={700} noWrap sx={{ width: '100%', mb: 0.5 }}>
                        {collection.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {collection.cases.length} Saved {collection.cases.length === 1 ? 'Case' : 'Cases'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
