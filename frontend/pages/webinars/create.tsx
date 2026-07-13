
import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, Fade } from '@mui/material';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function CreateWebinar() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'webinar',
    specialization: 'general',
    scheduledAt: '',
    duration: 30
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      // Backend expects specialization as array and scheduledAt as ISO string
      const payload = {
        ...form,
        specialization: [form.specialization],
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        duration: Number(form.duration)
      };
      await api.post('/webinars', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Webinar created successfully!');
      setTimeout(() => {
        router.push('/webinars');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create webinar');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Floating 3D decorative element */}
      <Box sx={{
        position: 'absolute',
        top: 40,
        right: 60,
        zIndex: 0,
        width: 120,
        height: 120,
        filter: 'blur(0.5px)',
        opacity: 0.18,
        background: 'radial-gradient(circle at 40% 60%, #0072ff 0%, #6dd5ed 80%, transparent 100%)',
        borderRadius: '50%',
        boxShadow: '0 8px 32px 0 #0072ff44',
        animation: 'floatY 4s ease-in-out infinite alternate',
      }} />
      <Fade in timeout={700}>
        <Paper elevation={16} sx={{
          p: 4,
          borderRadius: 5,
          minWidth: 350,
          maxWidth: 440,
          width: '100%',
          background: 'rgba(255,255,255,0.82)',
          boxShadow: '0 12px 40px 0 rgba(33,147,176,0.18)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
          border: '1.5px solid #e0eafc',
        }}>
          {/* MedInternia Logo */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img src="/med-internia-logo.jpg" alt="MedInternia Logo" style={{ width: 64, height: 64, borderRadius: 16, boxShadow: '0 2px 12px #0072ff44', background: '#e0eafc' }} />
          </Box>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 900, color: '#0056cc', letterSpacing: 1, zIndex: 1, position: 'relative', textShadow: '0 2px 8px #0072ff22' }}>Create Webinar</Typography>
          {error && <Alert severity="error" sx={{ zIndex: 1, position: 'relative', mb: 1 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ zIndex: 1, position: 'relative', mb: 1 }}>{success}</Alert>}
          <form onSubmit={handleSubmit} style={{ zIndex: 1, position: 'relative' }}>
            <TextField
              label="Title"
              name="title"
              fullWidth
              margin="normal"
              
              value={form.title}
              onChange={handleChange}
              required
              sx={{ bgcolor: '#f8fbff', borderRadius: 2, boxShadow: '0 1px 6px #0072ff22' }}
            />
            <TextField
              label="Description"
              name="description"
              fullWidth
              margin="normal"
              value={form.description}
              onChange={handleChange}
              required
              multiline
              rows={4}
              sx={{ bgcolor: '#f8fbff', borderRadius: 2, boxShadow: '0 1px 6px #0072ff22' }}
            />
            <TextField
              select
              label="Type"
              name="type"
              fullWidth
              margin="normal"
              value={form.type}
              onChange={handleChange}
              SelectProps={{ native: true }}
              required
              sx={{ bgcolor: '#f8fbff', borderRadius: 2, boxShadow: '0 1px 6px #0072ff22' }}
            >
              <option value="webinar">Webinar</option>
              <option value="ama">AMA</option>
              <option value="case-discussion">Case Discussion</option>
              <option value="live-conference">Live Conference</option>
            </TextField>
            <TextField
              select
              label="Specialization"
              name="specialization"
              fullWidth
              margin="normal"
              value={form.specialization}
              onChange={handleChange}
              SelectProps={{ native: true }}
              required
              sx={{ bgcolor: '#f8fbff', borderRadius: 2, boxShadow: '0 1px 6px #0072ff22' }}
            >
              <option value="general">General</option>
              <option value="cardiology">Cardiology</option>
              <option value="neurology">Neurology</option>
              <option value="oncology">Oncology</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="surgery">Surgery</option>
              <option value="psychiatry">Psychiatry</option>
              <option value="radiology">Radiology</option>
              <option value="emergency">Emergency</option>
              <option value="internal-medicine">Internal Medicine</option>
            </TextField>
            <TextField
              label="Scheduled At"
              name="scheduledAt"
              type="datetime-local"
              fullWidth
              margin="normal"
              value={form.scheduledAt}
              onChange={handleChange}
              required
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#f8fbff', borderRadius: 2, boxShadow: '0 1px 6px #0072ff22' }}
            />
            <TextField
                label="Duration (minutes)"
                name="duration"
                type="number"
                fullWidth
                margin="dense"
                value={form.duration}
                onChange={handleChange}
                required
                inputProps={{ min: 15, max: 480 }}
                sx={{ bgcolor: '#f8fbff', borderRadius: 2, mt: 2, mb: 2, boxShadow: '0 1px 6px #0072ff22' }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{
                mt: 2,
                py: 1.3,
                fontWeight: 700,
                fontSize: '1.1rem',
                borderRadius: 3,
                boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.10)',
                background: 'linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: 'linear-gradient(90deg, #0056cc 0%, #0072ff 100%)',
                  transform: 'scale(1.03)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)'
                }
              }}
            >
              Create Webinar
            </Button>
          </form>
          {/* 3D floating animation keyframes */}
          <style jsx>{`
            @keyframes floatY {
              0% { transform: translateY(0); }
              100% { transform: translateY(30px); }
            }
          `}</style>
        </Paper>
      </Fade>
    </Box>
  );
}
