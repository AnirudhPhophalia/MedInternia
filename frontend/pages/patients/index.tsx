import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import api from '../../utils/api';
import PatientCard from '../../components/PatientCard';
import PageHeader from '../../components/layout/PageHeader';
import { withAuth } from '../../components/withAuth';

function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const token = localStorage.getItem('token');
    api.get('/patients', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setPatients(res.data.data.patients || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch patients');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={56} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <PageHeader
          title="Patients"
          subtitle="Review patient profiles, contact details, and case history from one clean clinical workspace."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Patients' },
          ]}
          action={
            <Chip
              icon={<GroupIcon />}
              label={`${patients.length} patient${patients.length === 1 ? '' : 's'}`}
              color="primary"
              sx={{ fontWeight: 700, px: 1 }}
            />
          }
        />

        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 4,
            border: '1px solid #dbe7ff',
            background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={0.75}>
              <Typography variant="h6" fontWeight={800} color="#12376b">
                Patient Directory
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quickly scan patient contact details and open complete profiles for clinical follow-up.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {patients.length === 0 ? (
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px dashed #b8c7e6',
              py: { xs: 5, md: 7 },
              px: 3,
              textAlign: 'center',
            }}
          >
            <GroupIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              No patients found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              New patient profiles will appear here as soon as they are available.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {patients.map(p => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p._id}>
                <PatientCard patient={p} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default withAuth(Patients);
