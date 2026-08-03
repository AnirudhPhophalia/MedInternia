import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import api from '../../utils/api';
import PatientCard from '../../components/PatientCard';
import PageHeader from '../../components/layout/PageHeader';
import { withAuth } from '../../components/withAuth';

const PAGE_SIZE = 20;

function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  // SECURITY: Auth is handled via httpOnly cookies sent automatically by
  // axios (withCredentials: true in utils/api.ts). No manual token
  // retrieval or Authorization header is needed here.
  const fetchPatients = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await api.get('/patients', {
        params: { page: pageNum, limit: PAGE_SIZE },
      });
      const data = res.data.data;
      setPatients(data.patients || []);
      const pagination = data.pagination || { page: 1, total: 0, pages: 1 };
      setTotalPages(pagination.pages);
      setTotalPatients(pagination.total);
      setError('');
    } catch {
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(page);
  }, [page, fetchPatients]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  if (loading && patients.length === 0) {
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
          subtitle="Review patient profiles and case history from one clean clinical workspace."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Patients' },
          ]}
          action={
            <Chip
              icon={<GroupIcon />}
              label={`${totalPatients} patient${totalPatients === 1 ? '' : 's'}`}
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
                Browse patient profiles and open complete records for clinical follow-up.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {patients.length === 0 && !loading ? (
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
          <>
            <Grid container spacing={3}>
              {patients.map(p => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p._id}>
                  <PatientCard patient={p} />
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ mt: 5 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 700,
                      borderRadius: 2,
                    },
                  }}
                />
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

export default withAuth(Patients);
