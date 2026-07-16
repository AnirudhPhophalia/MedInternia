import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Card, CardContent, CircularProgress,
  Alert, Button, Chip, LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlipIcon from '@mui/icons-material/Flip';
import api from '../../utils/api';

const QUALITY_OPTIONS = [
  { label: 'Blackout', score: 0, color: '#ef4444', desc: 'Complete blank' },
  { label: 'Hard', score: 1, color: '#f97316', desc: 'Serious error' },
  { label: 'Difficult', score: 2, color: '#eab308', desc: 'With difficulty' },
  { label: 'OK', score: 3, color: '#22c55e', desc: 'Correct with effort' },
  { label: 'Good', score: 4, color: '#3b82f6', desc: 'Correct with hesitation' },
  { label: 'Perfect', score: 5, color: '#8b5cf6', desc: 'Instant recall' },
];

export default function FlashcardReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDue = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/auth/login'); return; }
        const res = await api.get('/flashcards/due', { headers: { Authorization: `Bearer ${token}` } });
        setCards(res.data.data);
      } catch {
        setError('Failed to load cards');
      } finally {
        setLoading(false);
      }
    };
    fetchDue();
  }, [router]);

  const handleReview = async (quality: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`/flashcards/${cards[currentIdx]._id}/review`, { quality }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviewed(r => r + 1);
      if (currentIdx + 1 >= cards.length) {
        setDone(true);
      } else {
        setCurrentIdx(i => i + 1);
        setFlipped(false);
      }
    } catch {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress size={48} /></Box>;

  if (done || cards.length === 0) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 100%)' }}>
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: 400 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {cards.length === 0 ? 'All caught up!' : 'Session Complete!'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {cards.length === 0
              ? 'No cards are due for review right now. Check back later!'
              : `You reviewed ${reviewed} card${reviewed !== 1 ? 's' : ''}. Great work!`}
          </Typography>
          <Button variant="contained" onClick={() => router.push('/flashcards')} startIcon={<ArrowBackIcon />}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            Back to Deck
          </Button>
        </Card>
      </Box>
    );
  }

  const card = cards[currentIdx];
  const progress = (currentIdx / cards.length) * 100;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 100%)', py: 6 }}>
      <Container maxWidth="sm">
        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/flashcards')} size="small" sx={{ color: 'text.secondary' }}>
              Back
            </Button>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {currentIdx + 1} / {cards.length}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 99 }} />
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Flashcard */}
        <Card
          onClick={() => setFlipped(!flipped)}
          sx={{
            borderRadius: 5, mb: 4, cursor: 'pointer', minHeight: 280,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            boxShadow: 8, transition: 'transform 0.15s',
            '&:hover': { transform: 'scale(1.015)' },
            background: flipped ? 'linear-gradient(135deg, #d4edda, #f0fff4)' : 'linear-gradient(135deg, #dbeafe, #eff6ff)',
          }}
        >
          <CardContent sx={{ p: 5, textAlign: 'center' }}>
            <Chip
              label={flipped ? 'ANSWER' : 'QUESTION'}
              size="small"
              color={flipped ? 'success' : 'primary'}
              sx={{ fontWeight: 700, mb: 3, fontSize: '12px', letterSpacing: 1 }}
            />
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.5, mb: 3 }}>
              {flipped ? card.answer : card.question}
            </Typography>
            {!flipped && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                <FlipIcon fontSize="small" />
                <Typography variant="caption">Click to reveal answer</Typography>
              </Box>
            )}
            {card.tags?.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
                {card.tags.map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '11px' }} />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Rating Buttons */}
        {flipped && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" textAlign="center" sx={{ mb: 2, fontWeight: 600 }}>
              How well did you recall this?
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {QUALITY_OPTIONS.map(q => (
                <Button
                  key={q.score}
                  variant="contained"
                  disabled={submitting}
                  onClick={() => handleReview(q.score)}
                  sx={{
                    borderRadius: 3, py: 1.5, flexDirection: 'column',
                    background: q.color, '&:hover': { background: q.color, opacity: 0.9 },
                    fontWeight: 700, textTransform: 'none', boxShadow: 2,
                    transition: 'transform 0.1s', '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  <Typography variant="body2" fontWeight={800}>{q.label}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>{q.desc}</Typography>
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
