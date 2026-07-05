import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
  Button,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  EmojiEvents,
  Notifications as NotificationsIcon,
  CalendarToday,
  Assignment,
  Tune
} from '@mui/icons-material';
import api from '../../utils/api';
import Link from 'next/link';

interface DashboardData {
  user: any;
  cases: any[];
  webinars: any[];
  notifications: any[];
  badges: any[];
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);

  const [showProfile, setShowProfile] = useState(true);
  const [showCases, setShowCases] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem('dashboard_showProfile');
    const savedCases = localStorage.getItem('dashboard_showCases');
    const savedEvents = localStorage.getItem('dashboard_showEvents');
    const savedNotifications = localStorage.getItem('dashboard_showNotifications');

    if (savedProfile !== null) setShowProfile(savedProfile === 'true');
    if (savedCases !== null) setShowCases(savedCases === 'true');
    if (savedEvents !== null) setShowEvents(savedEvents === 'true');
    if (savedNotifications !== null) setShowNotifications(savedNotifications === 'true');
  }, []);

  const handleToggleProfile = (val: boolean) => {
    setShowProfile(val);
    localStorage.setItem('dashboard_showProfile', String(val));
  };
  const handleToggleCases = (val: boolean) => {
    setShowCases(val);
    localStorage.setItem('dashboard_showCases', String(val));
  };
  const handleToggleEvents = (val: boolean) => {
    setShowEvents(val);
    localStorage.setItem('dashboard_showEvents', String(val));
  };
  const handleToggleNotifications = (val: boolean) => {
    setShowNotifications(val);
    localStorage.setItem('dashboard_showNotifications', String(val));
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

        if (!token || !userId) {
          router.replace('/auth/login');
          return;
        }

        const userRes = await api.get(`/users/${userId}/profile`);
        const user = userRes.data?.data?.user || userRes.data?.user || userRes.data;

        const optionalRequest = async <T,>(request: Promise<{ data: T }>, fallback: T) => {
          try {
            const response = await request;
            return response.data;
          } catch (err: any) {
            if (err.response?.status === 401) throw err;
            return fallback;
          }
        };

        // Fetch optional dashboard widgets independently so one role-restricted
        // endpoint cannot prevent the rest of the dashboard from loading.
        const [casesRes, webinarsRes, notificationsRes, badgesRes] = await Promise.all([
          user.userType === 'doctor'
            ? optionalRequest(api.get('/cases/my/cases?limit=5'), { data: { cases: [] } })
            : Promise.resolve({ data: { cases: [] } }),
          optionalRequest(api.get('/webinars/my?type=registered'), { data: { webinars: [] } }),
          optionalRequest(api.get('/notifications'), { notifications: [] }),
          optionalRequest(api.get(`/badges/user/${userId}`), { data: { badges: [] } })
        ]);
        const getList = (payload: any, key: string) => payload?.data?.[key] || payload?.[key] || [];

        setData({
          user,
          cases: getList(casesRes, 'cases'),
          webinars: getList(webinarsRes, 'webinars'),
          notifications: getList(notificationsRes, 'notifications').slice(0, 5),
          badges: getList(badgesRes, 'badges')
        });
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        if (err.response?.status === 401) {
          router.replace('/auth/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
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

  if (!data) return null;

  const { user, cases, webinars, notifications, badges } = data;

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 4 }} spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              Welcome back, {user.userType === 'doctor' ? 'Dr.' : ''} {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's what's happening with your account today.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setShowControls(prev => !prev)}
              startIcon={<Tune />}
              sx={{ borderRadius: 3, fontWeight: 700, px: 3, py: 1 }}
            >
              {showControls ? 'Hide Customizer' : 'Customize View'}
            </Button>
            <Button 
              variant="contained" 
              color="success" 
              component={Link} 
              href="/dashboard/learning-progress"
              sx={{ borderRadius: 3, fontWeight: 700, px: 3, py: 1 }}
            >
              My Learning Progress
            </Button>
          </Stack>
        </Stack>

        {/* Customization Control Panel */}
        {showControls && (
          <Card sx={{ mb: 4, p: 3, borderRadius: 3, boxShadow: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
              Customize Dashboard Visibility
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Toggle the switches below to show or hide different sections of your dashboard page.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} useFlexGap flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={showProfile} onChange={(e) => handleToggleProfile(e.target.checked)} color="primary" />}
                label="User Profile"
              />
              <FormControlLabel
                control={<Switch checked={showCases} onChange={(e) => handleToggleCases(e.target.checked)} color="primary" />}
                label="Recent Cases"
              />
              <FormControlLabel
                control={<Switch checked={showEvents} onChange={(e) => handleToggleEvents(e.target.checked)} color="primary" />}
                label="Upcoming Events"
              />
              <FormControlLabel
                control={<Switch checked={showNotifications} onChange={(e) => handleToggleNotifications(e.target.checked)} color="primary" />}
                label="Notifications"
              />
            </Stack>
          </Card>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* User Profile Summary */}
          {showProfile && (
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33.333%' } }}>
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      src={user.profilePicture}
                      sx={{
                        width: 100,
                        height: 100,
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: 40,
                        fontWeight: 700
                      }}
                    >
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} textAlign="center">
                      {user.userType === 'doctor' ? 'Dr.' : ''} {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      {user.specialization || user.medicalSchool || 'Medical Professional'}
                    </Typography>
                    <Chip
                      label={user.userType?.toUpperCase()}
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Stats */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {user.points || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Points
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {user.casesAnalyzed || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cases
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="warning.main">
                        {user.streak || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Streak
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress to next level */}
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Profile Score
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {user.profileScore || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={user.profileScore || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {/* Badges Preview */}
                  {badges.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Recent Badges
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {badges.slice(0, 4).map((badge: any, idx: number) => (
                          <Chip
                            key={idx}
                            icon={<EmojiEvents />}
                            label={badge.badge?.name || badge.name || 'Badge'}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                      {badges.length > 4 && (
                        <Button size="small" sx={{ mt: 1 }} component={Link} href="/profile/achievements">
                          View All ({badges.length})
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Right Column */}
          {(showCases || showEvents || showNotifications) && (
            <Box sx={{ flex: { xs: '1 1 100%', md: showProfile ? '1 1 66.666%' : '1 1 100%' } }}>
              <Stack spacing={3}>
                {/* Medical Case Tracker */}
                {showCases && (
                  <Card sx={{ boxShadow: 3, borderRadius: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight={600}>
                          Recent Cases
                        </Typography>
                      </Box>
                      {cases.length === 0 ? (
                        <Alert severity="info">No cases yet. Create your first case to get started!</Alert>
                      ) : (
                        <Box>
                          {cases.map((caseItem: any) => (
                            <Box
                              key={caseItem._id}
                              sx={{
                                p: 2,
                                mb: 1,
                                bgcolor: '#f8fafc',
                                borderRadius: 2,
                                border: '1px solid #e2e8f0',
                                '&:hover': { bgcolor: '#f1f5f9' }
                              }}
                            >
                              <Link href={`/cases/${caseItem._id}`} style={{ textDecoration: 'none' }}>
                                <Typography variant="subtitle1" fontWeight={600} color="primary.main" gutterBottom>
                                  {caseItem.title}
                                </Typography>
                              </Link>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {caseItem.description?.substring(0, 100)}...
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label={caseItem.difficulty || 'Beginner'} size="small" />
                                <Chip label={`${caseItem.likes?.length || 0} likes`} size="small" variant="outlined" />
                                <Chip label={`${caseItem.comments?.length || 0} comments`} size="small" variant="outlined" />
                              </Box>
                            </Box>
                          ))}
                          <Button fullWidth variant="outlined" sx={{ mt: 2 }} component={Link} href="/cases">
                            View All Cases
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Webinars and Notifications Row */}
                {(showEvents || showNotifications) && (
                  <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Upcoming Webinars */}
                    {showEvents && (
                      <Box sx={{ flex: 1 }}>
                        <Card sx={{ boxShadow: 3, borderRadius: 3, height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <CalendarToday sx={{ mr: 1, color: 'success.main' }} />
                              <Typography variant="h6" fontWeight={600}>
                                Upcoming Events
                              </Typography>
                            </Box>
                            {webinars.length === 0 ? (
                              <Alert severity="info">No upcoming webinars.</Alert>
                            ) : (
                              <Box>
                                {webinars.slice(0, 3).map((webinar: any) => (
                                  <Box
                                    key={webinar._id}
                                    sx={{
                                      p: 2,
                                      mb: 1,
                                      bgcolor: '#f0fdf4',
                                      borderRadius: 2,
                                      border: '1px solid #bbf7d0'
                                    }}
                                  >
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                      {webinar.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(webinar.date).toLocaleDateString()} at {webinar.time}
                                    </Typography>
                                  </Box>
                                ))}
                                <Button fullWidth variant="outlined" color="success" sx={{ mt: 2 }} component={Link} href="/webinars">
                                  View All Webinars
                                </Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {/* Recent Notifications */}
                    {showNotifications && (
                      <Box sx={{ flex: 1 }}>
                        <Card sx={{ boxShadow: 3, borderRadius: 3, height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <NotificationsIcon sx={{ mr: 1, color: 'warning.main' }} />
                              <Typography variant="h6" fontWeight={600}>
                                Notifications
                              </Typography>
                            </Box>
                            {notifications.length === 0 ? (
                              <Alert severity="info">No new notifications.</Alert>
                            ) : (
                              <Box>
                                {notifications.map((notification: any) => (
                                  <Box
                                    key={notification._id}
                                    sx={{
                                      p: 2,
                                      mb: 1,
                                      bgcolor: notification.read ? '#f8fafc' : '#fef3c7',
                                      borderRadius: 2,
                                      border: '1px solid',
                                      borderColor: notification.read ? '#e2e8f0' : '#fbbf24'
                                    }}
                                  >
                                    <Typography variant="body2" gutterBottom>
                                      {notification.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(notification.createdAt).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                ))}
                                <Button fullWidth variant="outlined" color="warning" sx={{ mt: 2 }} component={Link} href="/notifications">
                                  View All Notifications
                                </Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* If everything is hidden, show a nice empty state */}
          {!showProfile && !showCases && !showEvents && !showNotifications && (
            <Card sx={{ p: 4, width: '100%', textAlign: 'center', boxShadow: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Your Dashboard is Clean!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                All widgets are currently hidden. You can customize which sections you want to see.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  handleToggleProfile(true);
                  handleToggleCases(true);
                  handleToggleEvents(true);
                  handleToggleNotifications(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Restore Default Layout
              </Button>
            </Card>
          )}
        </Box>
      </Container>
    </Box>
  );
}
