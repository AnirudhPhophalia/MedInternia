import { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { canUser, getCurrentUserRole } from '../../utils/permissions';

const emptyForm = {
  internId: '',
  title: '',
  description: '',
  casesReviewed: '',
  pointsEarned: '',
  startDate: '',
  endDate: '',
  skills: ''
};

export default function CreateCertificate() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Page guard: check if user has permission
    const checkAccess = () => {
      const role = getCurrentUserRole();
      if (!role) {
        router.push('/auth/login');
        return;
      }
      if (!canUser(role, 'certificate:issue')) {
        router.push('/404');
      }
    };
    checkAccess();
  }, [router]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        internId: form.internId,
        title: form.title,
        description: form.description,
        casesReviewed: Number(form.casesReviewed),
        pointsEarned: Number(form.pointsEarned),
        duration: {
          startDate: form.startDate,
          endDate: form.endDate
        },
        skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean)
      };

      await api.post('/certificates/generate', payload);
      setSuccess('Certificate created successfully!');
      setForm(emptyForm);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create certificate');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>Create Certificate</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField label="Intern ID" name="internId" fullWidth margin="normal" value={form.internId} onChange={handleChange} required />
          <TextField label="Title" name="title" fullWidth margin="normal" value={form.title} onChange={handleChange} required />
          <TextField label="Description" name="description" fullWidth margin="normal" value={form.description} onChange={handleChange} required multiline rows={4} />
          <TextField label="Cases Reviewed" name="casesReviewed" type="number" inputProps={{ min: 1 }} fullWidth margin="normal" value={form.casesReviewed} onChange={handleChange} required />
          <TextField label="Points Earned" name="pointsEarned" type="number" inputProps={{ min: 0 }} fullWidth margin="normal" value={form.pointsEarned} onChange={handleChange} required />
          <TextField label="Start Date" name="startDate" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.startDate} onChange={handleChange} required />
          <TextField label="End Date" name="endDate" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.endDate} onChange={handleChange} required />
          <TextField label="Skills" name="skills" helperText="Separate skills with commas" fullWidth margin="normal" value={form.skills} onChange={handleChange} required />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Create Certificate
          </Button>
        </form>
      </Box>
    </Container>
  );
}
