import { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { canUser, getCurrentUserRole } from '../../utils/permissions';

export default function CreateCertificate() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '' });
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
      const token = localStorage.getItem('token');
      await api.post('/certificates/generate', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Certificate created successfully!');
      setForm({ title: '', description: '' });
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
          <TextField label="Title" name="title" fullWidth margin="normal" value={form.title} onChange={handleChange} required />
          <TextField label="Description" name="description" fullWidth margin="normal" value={form.description} onChange={handleChange} required multiline rows={4} />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Create Certificate
          </Button>
        </form>
      </Box>
    </Container>
  );
}
