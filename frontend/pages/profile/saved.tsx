import React, { useEffect, useState } from "react";
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../utils/api';
import CaseCard from '../../components/CaseCard';
import JobCard from '../../components/JobCard';
import WebinarCard from '../../components/WebinarCard';

export default function SavedItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedData, setSavedData] = useState<{ savedCases: any[], savedJobs: any[], savedWebinars: any[] }>({
    savedCases: [],
    savedJobs: [],
    savedWebinars: []
  });
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    const fetchSavedItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
          router.replace('/auth/login');
          return;
        }

        const res = await api.get(`/users/${userId}/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.success) {
          setSavedData(res.data.data);
        } else {
          setError('Failed to load saved items.');
        }
      } catch (err: any) {
        console.error('Saved items fetch error:', err);
        setError('Failed to load saved items.');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedItems();
  }, [router]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const { savedCases, savedJobs, savedWebinars } = savedData;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.back()}
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
      >
        Back to Profile
      </Button>

      <Typography variant="h3" fontWeight={900} color="#0056cc" sx={{ mb: 4 }}>
        Saved Items
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Tabs 
        value={currentTab} 
        onChange={(e, val) => setCurrentTab(val)}
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`Cases (${savedCases.length})`} sx={{ fontWeight: 600 }} />
        <Tab label={`Jobs (${savedJobs.length})`} sx={{ fontWeight: 600 }} />
        <Tab label={`Webinars (${savedWebinars.length})`} sx={{ fontWeight: 600 }} />
      </Tabs>

      <Box>
        {currentTab === 0 && (
          savedCases.length === 0 ? (
            <Typography color="text.secondary">You haven't saved any cases yet.</Typography>
          ) : (
            savedCases.map((c: any) => (
              <CaseCard key={c._id} caseData={c} />
            ))
          )
        )}
        
        {currentTab === 1 && (
          savedJobs.length === 0 ? (
            <Typography color="text.secondary">You haven't saved any jobs yet.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {savedJobs.map((j: any) => (
                <JobCard key={j._id} job={j} />
              ))}
            </Box>
          )
        )}
        
        {currentTab === 2 && (
          savedWebinars.length === 0 ? (
            <Typography color="text.secondary">You haven't saved any webinars yet.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {savedWebinars.map((w: any) => (
                <WebinarCard key={w._id} webinar={w} />
              ))}
            </Box>
          )
        )}
      </Box>
    </Container>
  );
}
