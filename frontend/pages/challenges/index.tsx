import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Divider
} from '@mui/material';
import api from '../../utils/api';

interface Question {
  questionText: string;
  options: string[];
  points: number;
}

interface Challenge {
  _id: string;
  title: string;
  description: string;
  specialty: string;
  timeLimit: number;
  questions: Question[];
  passingScore: number;
  badgeName: string;
}

export default function ChallengesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userType, setUserType] = useState('');

  // Active quiz states
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result dialog states
  const [resultData, setResultData] = useState<any>(null);

  // Create Challenge states
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('General');
  const [newLimit, setNewLimit] = useState(15);
  const [newPassScore, setNewPassScore] = useState(20);
  const [newBadge, setNewBadge] = useState('');

  // Local state for question builder
  const [newQText, setNewQText] = useState('');
  const [newQOptions, setNewQOptions] = useState<string[]>(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([]);

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/challenges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallenges(res.data?.data?.challenges || []);
    } catch (err) {
      console.error('Failed to fetch challenges', err);
      setError('Failed to load challenges list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userType');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setUserType(role || '');
    fetchChallenges();
  }, [router]);

  // Start assessment countdown timer
  useEffect(() => {
    if (activeChallenge && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitQuiz(true); // Auto-submit when time expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeChallenge, timeRemaining]);

  const handleStartChallenge = (ch: Challenge) => {
    setActiveChallenge(ch);
    setActiveQuestionIdx(0);
    setSelectedAnswers({});
    setTimeRemaining(ch.timeLimit * 60);
  };

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [activeQuestionIdx]: optIdx
    }));
  };

  const handleSubmitQuiz = async (isAutoSubmit = false) => {
    if (!activeChallenge) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const answersArray = activeChallenge.questions.map((_, idx) => 
      selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
    );

    const timeTaken = (activeChallenge.timeLimit * 60) - timeRemaining;

    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/challenges/${activeChallenge._id}/submit`, {
        answers: answersArray,
        timeTaken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResultData(res.data?.data);
      setActiveChallenge(null);
      if (isAutoSubmit) {
        alert('Time expired! Your assessment has been automatically submitted.');
      }
    } catch (err) {
      console.error('Failed to submit assessment', err);
      alert('Failed to submit quiz attempt.');
    }
  };

  const handleAddQuestionToBuilder = () => {
    if (!newQText.trim()) return;
    setBuilderQuestions(prev => [
      ...prev,
      {
        questionText: newQText.trim(),
        options: newQOptions.filter(Boolean),
        correctOptionIndex: newQCorrect,
        points: 10
      }
    ]);
    setNewQText('');
    setNewQOptions(['', '', '', '']);
    setNewQCorrect(0);
  };

  const handleCreateChallenge = async () => {
    if (builderQuestions.length === 0) {
      alert('Add at least one question to the challenge');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await api.post('/challenges', {
        title: newTitle,
        description: newDesc,
        specialty: newSpecialty,
        timeLimit: newLimit,
        questions: builderQuestions,
        passingScore: newPassScore,
        badgeName: newBadge
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewSpecialty('General');
      setBuilderQuestions([]);
      setNewBadge('');
      fetchChallenges();
    } catch (err) {
      console.error('Failed to create challenge', err);
      alert('Error creating challenge');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* active test taking mode */}
      {activeChallenge ? (
        <Card sx={{ p: 4, borderRadius: 4, border: '1.5px solid #1565c0', boxShadow: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={800}>
              {activeChallenge.title}
            </Typography>
            <Chip 
              label={`Time Remaining: ${formatTime(timeRemaining)}`}
              color={timeRemaining < 60 ? 'error' : 'primary'}
              sx={{ fontWeight: 700, fontSize: '1rem', px: 1 }}
            />
          </Box>

          <LinearProgress 
            variant="determinate" 
            value={((activeQuestionIdx + 1) / activeChallenge.questions.length) * 100}
            sx={{ height: 6, borderRadius: 3, mb: 4 }}
          />

          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Question {activeQuestionIdx + 1} of {activeChallenge.questions.length}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            {activeChallenge.questions[activeQuestionIdx].questionText}
          </Typography>

          <RadioGroup 
            value={selectedAnswers[activeQuestionIdx] !== undefined ? selectedAnswers[activeQuestionIdx] : ''}
            onChange={(e) => handleSelectOption(Number(e.target.value))}
          >
            <Stack spacing={2} sx={{ mb: 4 }}>
              {activeChallenge.questions[activeQuestionIdx].options.map((opt, oidx) => (
                <Card 
                  key={oidx}
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 3, 
                    border: selectedAnswers[activeQuestionIdx] === oidx ? '2px solid #1565c0' : '1px solid #e2e8f0',
                    bgcolor: selectedAnswers[activeQuestionIdx] === oidx ? '#f0f7ff' : '#fff'
                  }}
                >
                  <FormControlLabel
                    value={oidx}
                    control={<Radio sx={{ ml: 2 }} />}
                    label={<Typography variant="body1" sx={{ py: 1.5, px: 1, fontWeight: 500 }}>{opt}</Typography>}
                    sx={{ width: '100%', m: 0 }}
                  />
                </Card>
              ))}
            </Stack>
          </RadioGroup>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              disabled={activeQuestionIdx === 0} 
              onClick={() => setActiveQuestionIdx(prev => prev - 1)}
            >
              Previous
            </Button>
            {activeQuestionIdx < activeChallenge.questions.length - 1 ? (
              <Button 
                variant="contained" 
                onClick={() => setActiveQuestionIdx(prev => prev + 1)}
              >
                Next Question
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="success" 
                onClick={() => handleSubmitQuiz()}
              >
                Submit Challenge
              </Button>
            )}
          </Box>
        </Card>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h3" fontWeight={900} color="#1565c0" gutterBottom>
                Clinical Assessments
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Validate your diagnostic skills, pass scenarios, and earn certified educational badges.
              </Typography>
            </Box>
            {(userType === 'doctor' || userType === 'admin') && (
              <Button variant="contained" color="primary" onClick={() => setCreateOpen(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
                Create Assessment
              </Button>
            )}
          </Box>

          <Grid container spacing={3}>
            {challenges.map(ch => (
              <Grid size={{ xs: 12, sm: 6 }} key={ch._id}>
                <Card sx={{ height: '100%', border: '1px solid #e3eafc', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Chip label={ch.specialty} color="secondary" size="small" sx={{ fontWeight: 600 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        ⏱️ {ch.timeLimit} mins
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>{ch.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {ch.description}
                    </Typography>
                    <Typography variant="caption" display="block" color="primary" fontWeight={700}>
                      🎖️ Earns Badge: {ch.badgeName}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 3, pt: 0 }}>
                    <Button variant="contained" fullWidth onClick={() => handleStartChallenge(ch)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                      Start Assessment
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Result Dialog */}
      <Dialog 
        open={!!resultData} 
        onClose={() => setResultData(null)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', color: resultData?.status === 'passed' ? 'success.main' : 'error.main' }}>
          {resultData?.status === 'passed' ? '🎉 Challenge Passed!' : '❌ Assessment Failed'}
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Your Score: {resultData?.score} points
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Passing Target: {resultData?.passingScore} points
          </Typography>

          {resultData?.badgeAwarded && (
            <Card sx={{ bgcolor: '#fff9e6', border: '1px solid #fcd34d', p: 2, borderRadius: 3, my: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} color="#b45309">
                🎖️ New Badge Earned!
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#92400e">
                {activeChallenge?.badgeName || resultData?.attempt?.challenge?.badgeName || 'Specialist'}
              </Typography>
            </Card>
          )}

          {resultData?.pointsAwarded > 0 && (
            <Typography variant="subtitle2" color="success.main" fontWeight={700}>
              +50 Bonus Reward Points credited to your profile!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button variant="contained" onClick={() => setResultData(null)}>
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Challenge Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Timed Clinical Challenge</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Challenge Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} fullWidth />
            <TextField label="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} multiline rows={2} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Specialty</InputLabel>
              <Select value={newSpecialty} label="Specialty" onChange={e => setNewSpecialty(e.target.value)}>
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Pediatrics">Pediatrics</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Internal Medicine">Internal Medicine</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Time Limit (Mins)" type="number" value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} fullWidth />
              <TextField label="Passing Score" type="number" value={newPassScore} onChange={e => setNewPassScore(Number(e.target.value))} fullWidth />
            </Stack>
            <TextField label="Badge Awarded Name" placeholder="e.g. Cardiology Expert" value={newBadge} onChange={e => setNewBadge(e.target.value)} fullWidth />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={700}>Questions List ({builderQuestions.length} added)</Typography>

            <Box sx={{ border: '1px solid #e2e8f0', p: 2, borderRadius: 2 }}>
              <TextField label="Question Text" size="small" value={newQText} onChange={e => setNewQText(e.target.value)} fullWidth sx={{ mb: 1 }} />
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {newQOptions.map((opt, idx) => (
                  <Grid size={{ xs: 6 }} key={idx}>
                    <TextField 
                      label={`Option ${idx + 1}`} 
                      size="small" 
                      value={opt} 
                      onChange={e => {
                        const copy = [...newQOptions];
                        copy[idx] = e.target.value;
                        setNewQOptions(copy);
                      }} 
                      fullWidth 
                    />
                  </Grid>
                ))}
              </Grid>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Correct Option</InputLabel>
                <Select value={newQCorrect} label="Correct Option" onChange={e => setNewQCorrect(Number(e.target.value))}>
                  <MenuItem value={0}>Option 1</MenuItem>
                  <MenuItem value={1}>Option 2</MenuItem>
                  <MenuItem value={2}>Option 3</MenuItem>
                  <MenuItem value={3}>Option 4</MenuItem>
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" onClick={handleAddQuestionToBuilder}>Add Question to Challenge</Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreateChallenge} variant="contained" disabled={builderQuestions.length === 0 || !newTitle.trim() || !newBadge.trim()}>Create Challenge</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
