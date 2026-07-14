import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, CircularProgress, Alert, Button, Avatar, Chip,
  Tabs, Tab, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import api from '../../utils/api';
import PageHeader from '../../components/layout/PageHeader';
import Link from 'next/link';

export default function MentorshipDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [mentorship, setMentorship] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const [goalModal, setGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '' });

  useEffect(() => {
    if (!id) return;
    const fetchMentorship = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const [profileRes, mentorshipRes] = await Promise.all([
          api.get('/users/profile', { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/mentorship/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setUser(profileRes.data.data);
        setMentorship(mentorshipRes.data.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load mentorship details');
      } finally {
        setLoading(false);
      }
    };
    fetchMentorship();
  }, [id, router]);

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (!mentorship || !user) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Not found'}</Alert></Container>;

  const isDoctor = user.userType === 'doctor';
  const partner = isDoctor ? mentorship.mentee : mentorship.mentor;
  const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : 'Unknown';
  const roleLabel = isDoctor ? 'Mentee' : 'Mentor';

  const handleUpdateStatus = async (status: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/mentorship/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      setMentorship({ ...mentorship, status });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/mentorship/${id}/goals/${goalId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMentorship((prev: any) => ({
        ...prev,
        goals: prev.goals.map((g: any) => g._id === goalId ? { ...g, isCompleted: !g.isCompleted } : g)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGoal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/mentorship/${id}/goals`, newGoal, { headers: { Authorization: `Bearer ${token}` } });
      setMentorship(res.data.data);
      setGoalModal(false);
      setNewGoal({ title: '', description: '' });
    } catch (err) {
      alert('Failed to add goal');
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: '#f8fbff', py: 6 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/mentorship"
          sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
        >
          Back to Dashboard
        </Button>

        <Grid container spacing={4}>
          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 4, textAlign: 'center', p: 4 }}>
              <Avatar src={partner?.profilePicture} sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">{roleLabel}</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                {isDoctor ? partnerName : `Dr. ${partnerName}`}
              </Typography>
              <Chip 
                label={mentorship.status.toUpperCase()} 
                color={mentorship.status === 'active' ? 'success' : 'default'}
                sx={{ fontWeight: 700, mb: 3 }}
              />

              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">Focus Area</Typography>
                <Typography variant="body1" fontWeight={500}>{mentorship.specialtyRequested}</Typography>
              </Box>

              {mentorship.status === 'pending' && isDoctor && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="contained" color="success" onClick={() => handleUpdateStatus('active')}>Accept Mentorship</Button>
                  <Button variant="outlined" color="error" onClick={() => handleUpdateStatus('rejected')}>Decline</Button>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                <Tab label="Overview" />
                <Tab label={`Goals (${mentorship.goals.length})`} />
                <Tab label="Meetings" />
              </Tabs>
            </Box>

            {tab === 0 && (
              <Card sx={{ borderRadius: 4, p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Initial Request Message</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                  {mentorship.initialMessage}
                </Typography>
              </Card>
            )}

            {tab === 1 && (
              <Card sx={{ borderRadius: 4, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Mentorship Goals</Typography>
                  {mentorship.status === 'active' && (
                    <Button startIcon={<AddIcon />} size="small" variant="contained" onClick={() => setGoalModal(true)}>
                      Add Goal
                    </Button>
                  )}
                </Box>
                
                {mentorship.goals.length === 0 ? (
                  <Typography color="text.secondary">No goals have been set yet.</Typography>
                ) : (
                  <List>
                    {mentorship.goals.map((goal: any) => (
                      <ListItem key={goal._id} sx={{ bgcolor: '#f4f6f8', borderRadius: 2, mb: 1 }}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={goal.isCompleted}
                            onChange={() => handleToggleGoal(goal._id)}
                            disabled={mentorship.status !== 'active'}
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={goal.title}
                          secondary={goal.description}
                          sx={{ textDecoration: goal.isCompleted ? 'line-through' : 'none', opacity: goal.isCompleted ? 0.6 : 1 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Card>
            )}

            {tab === 2 && (
              <Card sx={{ borderRadius: 4, p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Scheduled Meetings</Typography>
                {mentorship.meetings.length === 0 ? (
                  <Typography color="text.secondary">No meetings scheduled yet.</Typography>
                ) : (
                  <List>
                    {mentorship.meetings.map((meeting: any) => (
                      <ListItem key={meeting._id} sx={{ bgcolor: '#f4f6f8', borderRadius: 2, mb: 1 }}>
                        <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary={meeting.topic}
                          secondary={new Date(meeting.scheduledAt).toLocaleString()}
                        />
                        {meeting.link && (
                          <Button startIcon={<VideoCallIcon />} variant="outlined" size="small" href={meeting.link} target="_blank">
                            Join
                          </Button>
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Card>
            )}

          </Grid>
        </Grid>

        {/* Goal Modal */}
        <Dialog open={goalModal} onClose={() => setGoalModal(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add New Goal</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth label="Goal Title" value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth label="Description (Optional)" value={newGoal.description} multiline rows={3}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setGoalModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddGoal} disabled={!newGoal.title}>Add Goal</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
