import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../utils/api';

interface MentorshipRequestModalProps {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
}

export default function MentorshipRequestModal({ open, onClose, doctorId, doctorName }: MentorshipRequestModalProps) {
  const [specialtyRequested, setSpecialtyRequested] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!specialtyRequested.trim() || !initialMessage.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await api.post('/mentorship', {
        mentorId: doctorId,
        specialtyRequested,
        initialMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSpecialtyRequested('');
        setInitialMessage('');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send mentorship request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Request Mentorship</Typography>
        <IconButton onClick={onClose} size="small" disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {success ? (
          <Alert severity="success">
            Your mentorship request has been sent to Dr. {doctorName}!
          </Alert>
        ) : (
          <>
            <Typography variant="body1" sx={{ mb: 3 }}>
              You are requesting to be mentored by <strong>Dr. {doctorName}</strong>. 
              Please provide some details so they can understand your goals.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              fullWidth
              label="Specialty / Area of Interest"
              placeholder="e.g., Cardiology, Surgery Residency Prep"
              value={specialtyRequested}
              onChange={(e) => setSpecialtyRequested(e.target.value)}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Why are you requesting mentorship?"
              placeholder="Briefly introduce yourself and outline what you hope to learn or achieve..."
              multiline
              rows={4}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
            />
          </>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !specialtyRequested || !initialMessage}>
            {loading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
