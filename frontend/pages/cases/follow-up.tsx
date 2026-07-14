import { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import api from '../../utils/api';
import { withAuth } from '../../components/withAuth';

function CaseFollowUp() {
  const [caseId, setCaseId] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${caseId}/follow-ups`, { text: followUp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Follow-up added successfully!');
      setFollowUp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add follow-up');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>Add Case Follow-Up</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField label="Case ID" value={caseId} onChange={e => setCaseId(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Follow-Up" value={followUp} onChange={e => setFollowUp(e.target.value)} fullWidth margin="normal" required multiline rows={3} />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Add Follow-Up
          </Button>
        </form>
      </Box>
    </Container>
  );
}
export default withAuth(CaseFollowUp);  