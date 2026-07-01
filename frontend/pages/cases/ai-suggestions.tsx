import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Button
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterListIcon from '@mui/icons-material/FilterList';
import StarIcon from '@mui/icons-material/Star';
import api from '../../utils/api';
import Link from 'next/link';

const predefinedSpecialties = [
  "Cardiology",
  "Neurology",
  "Pediatrics",
  "Oncology",
  "General Medicine",
  "Orthopedics",
  "Dermatology",
  "Psychiatry",
  "Emergency Medicine"
];

export default function AISuggestions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [user, setUser] = useState<any>(null);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [caseSuggestions, setCaseSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');

  // Selected filter specialty for recommendations
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
          router.replace('/auth/login');
          return;
        }

        // Fetch user profile
        const userRes = await api.get(`/users/${userId}/profile`);
        const userData = userRes.data?.data?.user || userRes.data?.user || userRes.data;
        setUser(userData);
        if (userData.specialization) {
          setSelectedSpecialty(userData.specialization);
        } else if (userData.interests && userData.interests.length > 0) {
          setSelectedSpecialty(userData.interests[0]);
        } else {
          setSelectedSpecialty("Cardiology");
        }

        // Fetch all cases
        const casesRes = await api.get('/cases');
        setAllCases(casesRes.data?.data?.cases || casesRes.data?.cases || []);

      } catch (err: any) {
        console.error('AI suggestions init error:', err);
        setError('Failed to load recommendation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitData();
  }, [router]);

  const handleGetCaseSuggestions = async (caseId: string) => {
    if (!caseId) return;
    setSuggestionsLoading(true);
    setSuggestionsError('');
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/cases/${caseId}/ai-suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseSuggestions(res.data?.data?.suggestions || res.data?.suggestions || []);
    } catch (e) {
      console.error(e);
      setSuggestionsError('Failed to fetch similar case recommendations');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Calculate Match Score
  const getMatchScore = (c: any) => {
    if (!user) return 70;
    let score = 70;
    if (c.specialization && user.specialization && c.specialization.toLowerCase() === user.specialization.toLowerCase()) {
      score += 15;
    }
    const userInterests = user.interests || [];
    const matchedTags = (c.tags || []).filter((tag: string) => userInterests.includes(tag));
    score += matchedTags.length * 5;
    return Math.min(score, 99);
  };

  // Filter recommendations by selectedSpecialty
  const recommendedCases = allCases
    .filter(c => c.specialization?.toLowerCase() === selectedSpecialty.toLowerCase())
    .map(c => ({ ...c, matchScore: getMatchScore(c) }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={900} color="#1565c0" gutterBottom>
            Personalized AI Recommendations
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ maxW: 600, mx: 'auto' }}>
            Explore clinically relevant cases and medical content customized to your interests and specialization.
          </Typography>
        </Box>

        {/* Suggested Specialties Chip Grid */}
        <Card sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <FilterListIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Suggested Specialties to Explore
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {predefinedSpecialties.map(spec => (
                <Chip 
                  key={spec} 
                  label={spec} 
                  clickable
                  color={selectedSpecialty.toLowerCase() === spec.toLowerCase() ? 'primary' : 'default'}
                  onClick={() => setSelectedSpecialty(spec)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={4}>
          {/* Left Column: Personalized Case Recommendations */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: '#333' }}>
              Recommended Cases for You
            </Typography>
            
            {recommendedCases.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                No cases found for {selectedSpecialty}. Try selecting another specialty to find learning material!
              </Alert>
            ) : (
              <Stack spacing={3}>
                {recommendedCases.map((c) => (
                  <Card key={c._id} sx={{
                    borderRadius: 4,
                    border: '1px solid #e3eafc',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {c.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Specialization: <strong>{c.specialization}</strong> | Difficulty: <strong>{c.difficulty}</strong>
                          </Typography>
                        </Box>
                        <Chip 
                          icon={<StarIcon style={{ color: '#d97706' }} />}
                          label={`${c.matchScore}% Match`}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2.5
                      }}>
                        {c.description}
                      </Typography>
                      <Button 
                        variant="contained" 
                        component={Link}
                        href={`/cases/${c._id}`}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Start Learning
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Right Column: Case-to-Case Similar suggestions */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: '#333' }}>
              Similar Case Recommendations
            </Typography>
            <Card sx={{ p: 3, borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <AutoAwesomeIcon color="warning" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Find Relational AI Insights
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select an active case to retrieve its AI-matched similar cases and expand your learning paths.
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="case-select-label">Select Case</InputLabel>
                  <Select
                    labelId="case-select-label"
                    value={selectedCaseId}
                    label="Select Case"
                    onChange={(e) => {
                      setSelectedCaseId(e.target.value);
                      handleGetCaseSuggestions(e.target.value);
                    }}
                  >
                    {allCases.map(c => (
                      <MenuItem key={c._id} value={c._id}>{c.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {suggestionsLoading && (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                )}
                
                {suggestionsError && (
                  <Alert severity="error" sx={{ mb: 2 }}>{suggestionsError}</Alert>
                )}

                {caseSuggestions.length > 0 ? (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" fontWeight={700}>AI Similar Results:</Typography>
                    {caseSuggestions.map((s) => (
                      <Box key={s._id} sx={{ p: 2, bgcolor: '#f0fdfa', borderRadius: 3, border: '1px solid #ccfbf1' }}>
                        <Link href={`/cases/${s._id}`} style={{ textDecoration: 'none' }}>
                          <Typography variant="body2" fontWeight={700} color="#0f766e" gutterBottom>
                            {s.title}
                          </Typography>
                        </Link>
                        <Typography variant="caption" color="text.secondary">
                          Specialty: {s.specialization} | Difficulty: {s.difficulty}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  !suggestionsLoading && selectedCaseId && (
                    <Alert severity="info" sx={{ mt: 1 }}>No similar cases found.</Alert>
                  )
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
