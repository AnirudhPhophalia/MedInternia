import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Grid, Card, CardContent, Button, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, IconButton, Divider, Chip } from '@mui/material';
import api, { getSocketUrl } from '../../../utils/api';
import { io, Socket } from 'socket.io-client';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function JoinWebinar() {
  const router = useRouter();
  const { id } = router.query;
  const [webinar, setWebinar] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  
  // Q&A State
  const [newQuestion, setNewQuestion] = useState('');

  // Host Poll Creation State
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const [webinarRes, userRes] = await Promise.all([
          api.get(`/webinars/${id}`),
          api.get('/auth/profile')
        ]);
        
        const webinarData = webinarRes.data.data.webinar;
        setWebinar(webinarData);
        setCurrentUserId(userRes.data?.data?.user?._id);

        // Pre-populate userVotes if poll.votes exists from REST response
        if (webinarData?.polls && userRes.data?.data?.user?._id) {
          const uId = userRes.data.data.user._id;
          const initialVotes: Record<string, number> = {};
          webinarData.polls.forEach((p: any) => {
            if (p.votes && typeof p.votes === 'object' && uId in p.votes) {
              initialVotes[p._id] = p.votes[uId];
            }
          });
          setUserVotes(initialVotes);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch webinar details');
        setLoading(false);
      }
    };
    
    fetchData();

    // Socket Connection
    const newSocket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

      newSocket.on('connect', () => {
        newSocket.emit('join_webinar', id);
      });

      newSocket.on('webinar_update', (updatedWebinar: any) => {
        setWebinar(updatedWebinar);
      });

      setSocket(newSocket);

      return () => {
        newSocket.emit('leave_webinar', id);
        newSocket.disconnect();
      };
  }, [id]);

  const isHost = webinar?.host?._id === currentUserId || webinar?.host === currentUserId;

  // --------------------------------------------------------
  // Polling Functions
  // --------------------------------------------------------
  const handleCreatePoll = async () => {
    if (!newPollQuestion.trim() || newPollOptions.some(opt => !opt.trim())) return;
    try {
      await api.post(`/webinars/${id}/polls`, {
        question: newPollQuestion,
        options: newPollOptions.filter(opt => opt.trim())
      });
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    try {
      setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }));
      await api.post(`/webinars/${id}/polls/${pollId}/vote`, { optionIndex });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await api.patch(`/webinars/${id}/polls/${pollId}/close`);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------------------------
  // Q&A Functions
  // --------------------------------------------------------
  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await api.post(`/webinars/${id}/qna`, { question: newQuestion });
      setNewQuestion('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteQuestion = async (qnaId: string) => {
    try {
      await api.patch(`/webinars/${id}/qna/${qnaId}/upvote`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAnswered = async (qnaId: string) => {
    try {
      await api.patch(`/webinars/${id}/qna/${qnaId}/answer`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !webinar) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Webinar not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/webinars')} sx={{ mt: 2 }}>
          Back to Webinars
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/webinars')} sx={{ mb: 1 }}>
              Back
            </Button>
            <Typography variant="h4" fontWeight={700}>{webinar.title}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
              <Chip label={webinar.status?.toUpperCase()} color={webinar.status === 'live' ? 'error' : 'primary'} size="small" />
              <Typography variant="body2" color="text.secondary">
                Host: {webinar.host?.firstName} {webinar.host?.lastName}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Video / Stream Area */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column', bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
              {webinar.meetingLink ? (
                <iframe
                  src={webinar.meetingLink}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  allow="camera; microphone; display-capture; autoplay"
                />
              ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                  <Typography variant="h6">Live Stream Not Started</Typography>
                  <Typography variant="body2" color="gray">The host has not launched the meeting link yet.</Typography>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Interactive Sidebar (Polls & Q&A) */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '600px', gap: 2 }}>
              {/* Polls Section */}
              <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#f0f4f8', borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary">Polls</Typography>
                </Box>
                <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
                  {isHost && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="subtitle2" gutterBottom>Create New Poll</Typography>
                      <TextField fullWidth size="small" placeholder="Poll Question" value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)} sx={{ mb: 1 }} />
                      {newPollOptions.map((opt, i) => (
                        <TextField key={i} fullWidth size="small" placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                          const opts = [...newPollOptions];
                          opts[i] = e.target.value;
                          setNewPollOptions(opts);
                        }} sx={{ mb: 1 }} />
                      ))}
                      <Button size="small" onClick={() => setNewPollOptions([...newPollOptions, ''])}>+ Add Option</Button>
                      <Button variant="contained" size="small" fullWidth sx={{ mt: 1 }} onClick={handleCreatePoll}>Launch Poll</Button>
                    </Box>
            </Box>
            <CardContent sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                {webinar.qna && webinar.qna.length > 0 ? [...webinar.qna]
                  .sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0))
                  .map((q: any) => {
                    const hasUpvoted = q.upvotes?.includes(currentUserId);
                    const authorName = q.author?.firstName ? `${q.author.firstName} ${q.author.lastName}` : 'Attendee';

                    return (
                      <Box key={q._id} sx={{ mb: 2, display: 'flex', gap: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <IconButton size="small" onClick={() => handleUpvoteQuestion(q._id)} color={hasUpvoted ? "primary" : "default"}>
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="caption" fontWeight={700}>{q.upvotes?.length || 0}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, bgcolor: q.isAnswered ? '#f0fdf4' : '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>{authorName}</Typography>
                            {q.isAnswered && <Chip size="small" icon={<CheckCircleIcon />} label="Answered" color="success" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.65rem' } }} />}
                          </Box>
                          <Typography variant="body2">{q.question}</Typography>
                          
                          {isHost && !q.isAnswered && (
                            <Button size="small" color="success" sx={{ mt: 1, p: 0, fontSize: '0.75rem' }} onClick={() => handleMarkAnswered(q._id)}>Mark Answered</Button>
                          )}
                        </Box>
                      </Box>
                    );
                }) : <Typography variant="body2" color="text.secondary">No questions yet.</Typography>}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Ask a question..." 
                  value={newQuestion} 
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <Button variant="contained" onClick={handleAskQuestion}>Ask</Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
