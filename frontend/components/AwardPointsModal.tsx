import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Slider,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../utils/api';

interface AwardPointsModalProps {
  open: boolean;
  onClose: () => void;
  internId: string;
  internName: string;
  onSuccess: (newPoints: number) => void;
}

const categories = [
  { key: 'diagnosticReasoning', label: 'Diagnostic Reasoning' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'evidenceSupport', label: 'Evidence Support' },
  { key: 'riskAwareness', label: 'Risk Awareness' },
  { key: 'communicationClarity', label: 'Communication Clarity' }
];

export default function AwardPointsModal({ open, onClose, internId, internName, onSuccess }: AwardPointsModalProps) {
  const [rubric, setRubric] = useState({
    diagnosticReasoning: 3,
    completeness: 3,
    evidenceSupport: 3,
    riskAwareness: 3,
    communicationClarity: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: string) => (event: Event, newValue: number | number[]) => {
    setRubric({
      ...rubric,
      [key]: newValue as number
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/users/${internId}/award-points`, { rubric });
      if (res.data.success) {
        onSuccess(res.data.points);
        onClose();
      } else {
        setError(res.data.message || 'Failed to award points');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while awarding points');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = Object.values(rubric).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Score Intern: {internName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Evaluate the intern across the following 5 categories. Each category is scored from 1 to 5.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {categories.map((cat) => (
          <Box key={cat.key} sx={{ mb: 3 }}>
            <Typography gutterBottom>
              {cat.label}: {(rubric as any)[cat.key]} / 5
            </Typography>
            <Slider
              value={(rubric as any)[cat.key]}
              onChange={handleChange(cat.key)}
              step={1}
              marks
              min={1}
              max={5}
              valueLabelDisplay="auto"
            />
          </Box>
        ))}

        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6">
            Total Score to Award: {totalPoints}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Award Score'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
