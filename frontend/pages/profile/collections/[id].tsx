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
  Button,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '../../../utils/api';
import PageHeader from '../../../components/layout/PageHeader';
import Link from 'next/link';
import CaseCard from '../../../components/CaseCard';

export default function CollectionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const fetchCollection = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const res = await api.get(`/collections/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCollection(res.data.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load collection details');
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [id, router]);

  const handleRemoveCase = async (caseId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/collections/${id}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove from local state
      setCollection((prev: any) => ({
        ...prev,
        cases: prev.cases.filter((c: any) => c._id !== caseId)
      }));
    } catch (err) {
      console.error('Failed to remove case', err);
      alert('Failed to remove case from collection');
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #f8fbff 0%, #e8f4ff 100%)', py: 6 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/profile/collections"
          sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
        >
          Back to Collections
        </Button>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : collection && (
          <>
            <PageHeader 
              title={collection.name} 
              subtitle={`${collection.cases.length} Saved Cases`}
              breadcrumbs={[
                { label: 'Home', href: '/' }, 
                { label: 'Profile', href: '/profile/me' }, 
                { label: 'Collections', href: '/profile/collections' },
                { label: collection.name }
              ]}
            />

            <Grid container spacing={3}>
              {collection.cases.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.8)' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      This collection is empty.
                    </Typography>
                    <Button variant="outlined" component={Link} href="/cases">
                      Browse Cases
                    </Button>
                  </Card>
                </Grid>
              ) : (
                collection.cases.map((caseItem: any) => (
                  <Grid size={{ xs: 12, md: 6 }} key={caseItem._id}>
                    <Box sx={{ position: 'relative' }}>
                      <CaseCard caseData={caseItem} />
                      <IconButton 
                        onClick={() => handleRemoveCase(caseItem._id)}
                        sx={{ 
                          position: 'absolute', 
                          top: 16, 
                          right: 16, 
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                          color: 'error.main',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          '&:hover': { bgcolor: 'error.main', color: 'white' }
                        }}
                        title="Remove from collection"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}
