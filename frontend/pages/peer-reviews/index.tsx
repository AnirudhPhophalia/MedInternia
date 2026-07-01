import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Rating
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ReplyIcon from '@mui/icons-material/Reply';
import StarIcon from '@mui/icons-material/Star';
import api from '../../utils/api';
import PeerReviewCard from '../../components/PeerReviewCard';

interface AnalyticsData {
  reviewsReceived: number;
  reviewsGiven: number;
  averageRatingReceived: number;
  topTags: { [key: string]: number };
  monthlyTrend: { [key: string]: { received: number; given: number } };
}

export default function PeerReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Analytics states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User ID not found. Please login again.');
      setLoading(false);
      return;
    }
    api.get(`/peer-reviews/user/${userId}/received`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setReviews(res.data.data.reviews || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch peer reviews');
        setLoading(false);
      });
  }, []);

  const fetchAnalytics = () => {
    setAnalyticsLoading(true);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setAnalyticsError('User ID not found.');
      setAnalyticsLoading(false);
      return;
    }
    api.get(`/peer-reviews/user/${userId}/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setAnalytics(res.data.data.analytics);
        setAnalyticsLoading(false);
      })
      .catch(() => {
        setAnalyticsError('Failed to fetch peer review analytics');
        setAnalyticsLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 1 && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab]);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Render SVG Trend Chart
  const renderTrendChart = (trend: { [key: string]: { received: number; given: number } }) => {
    const months = Object.keys(trend).sort();
    if (months.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          No trend data available yet.
        </Typography>
      );
    }

    const maxVal = Math.max(
      ...months.map(m => Math.max(trend[m].received, trend[m].given)),
      1
    );

    const chartWidth = 500;
    const chartHeight = 180;
    const padding = 30;
    const barWidth = 25;
    const spacing = (chartWidth - padding * 2) / months.length;

    return (
      <Box sx={{ width: '100%', overflowX: 'auto', py: 2 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: '400px' }}>
          {/* Y Axis Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + (chartHeight - padding * 2) * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4" />
                <text x={padding - 5} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Render Bars */}
          {months.map((month, idx) => {
            const x = padding + idx * spacing + (spacing - barWidth * 2) / 2;
            const hReceived = ((trend[month].received) / maxVal) * (chartHeight - padding * 2);
            const hGiven = ((trend[month].given) / maxVal) * (chartHeight - padding * 2);

            const yReceived = chartHeight - padding - hReceived;
            const yGiven = chartHeight - padding - hGiven;

            return (
              <g key={month}>
                {/* Received Bar (Blue) */}
                <rect
                  x={x}
                  y={yReceived}
                  width={barWidth}
                  height={hReceived}
                  fill="url(#receivedGrad)"
                  rx="3"
                />
                {/* Given Bar (Purple) */}
                <rect
                  x={x + barWidth + 4}
                  y={yGiven}
                  width={barWidth}
                  height={hGiven}
                  fill="url(#givenGrad)"
                  rx="3"
                />
                {/* X Axis Label */}
                <text x={x + barWidth} y={chartHeight - 10} fontSize="10" fill="#64748b" textAnchor="middle">
                  {month}
                </text>
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="givenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#3b82f6', borderRadius: '50%' }} />
            <Typography variant="caption" color="text.secondary">Reviews Received</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#a78bfa', borderRadius: '50%' }} />
            <Typography variant="caption" color="text.secondary">Reviews Given</Typography>
          </Stack>
        </Stack>
      </Box>
    );
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography 
          variant="h3" 
          fontWeight={900} 
          color="#1565c0" 
          gutterBottom
          sx={{ textAlign: 'center', mb: 3 }}
        >
          Peer Review Analytics
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          centered
          sx={{ mb: 4, borderBottom: '1px solid #e3eafc' }}
        >
          <Tab label="My Reviews" sx={{ fontWeight: 600 }} />
          <Tab label="Analytics Dashboard" sx={{ fontWeight: 600 }} />
        </Tabs>

        {activeTab === 0 && (
          <Stack spacing={2}>
            {reviews.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                No peer reviews found.
              </Typography>
            ) : (
              reviews.map(r => (
                <PeerReviewCard key={r._id} review={r} />
              ))
            )}
          </Stack>
        )}

        {activeTab === 1 && (
          <Box>
            {analyticsLoading && (
              <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            )}
            {analyticsError && (
              <Alert severity="error">{analyticsError}</Alert>
            )}
            {analytics && (
              <Stack spacing={4}>
                {/* KPI Cards Grid */}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #1e3a8a 30%, #3b82f6 90%)',
                      color: '#fff',
                      borderRadius: 4,
                      boxShadow: '0 4px 20px rgba(30,58,138,0.15)'
                    }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 600 }}>Reviews Received</Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>{analytics.reviewsReceived}</Typography>
                          </Box>
                          <RateReviewIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #6d28d9 30%, #a78bfa 90%)',
                      color: '#fff',
                      borderRadius: 4,
                      boxShadow: '0 4px 20px rgba(109,40,217,0.15)'
                    }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 600 }}>Reviews Given</Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>{analytics.reviewsGiven}</Typography>
                          </Box>
                          <ReplyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #059669 30%, #34d399 90%)',
                      color: '#fff',
                      borderRadius: 4,
                      boxShadow: '0 4px 20px rgba(5,150,105,0.15)'
                    }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 600 }}>Avg Rating Received</Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                              {analytics.averageRatingReceived.toFixed(1)}
                            </Typography>
                            <Rating 
                              value={analytics.averageRatingReceived} 
                              readOnly 
                              precision={0.1}
                              size="small"
                              emptyIcon={<StarIcon style={{ color: 'rgba(255,255,255,0.3)' }} fontSize="inherit" />}
                            />
                          </Box>
                          <StarIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Grid for Trend and Scorecard */}
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                          Review Activity Trends
                        </Typography>
                        {renderTrendChart(analytics.monthlyTrend)}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                          Reviewer Scorecard
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Key areas of expertise based on reviews received:
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {Object.keys(analytics.topTags).length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No feedback tags available yet.
                            </Typography>
                          ) : (
                            Object.entries(analytics.topTags).map(([tag, count]) => (
                              <Chip 
                                key={tag} 
                                label={`${tag} (${count})`} 
                                color="primary" 
                                variant="outlined" 
                                sx={{ mb: 1 }}
                              />
                            ))
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
}
