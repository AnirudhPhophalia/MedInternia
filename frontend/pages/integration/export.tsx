import { useState } from 'react';
import { Container, Typography, Button, Box, Alert } from '@mui/material';
import api from '../../utils/api';

export default function ExportBadges() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState<'linkedin' | 'github' | null>(null);

  const handleExport = async (platform: 'linkedin' | 'github') => {
    setMessage('');
    setError('');
    setInfo('');
    setLoading(platform);
    try {
      const res = await api.post(`/integration/${platform}/export`, {});

      if (res.data?.success) {
        const reference = res.data?.data?.reference;
        setMessage(
          reference
            ? `${res.data.message} Reference: ${reference}`
            : res.data.message,
        );
      } else {
        setError(res.data?.message || 'Export failed');
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      const apiMessage = err.response?.data?.message || 'Export failed';
      const reference = err.response?.data?.data?.reference;

      if (code === 'EXPORT_UNAVAILABLE' || code === 'EXPORT_NOT_IMPLEMENTED') {
        setInfo(
          reference ? `${apiMessage} Reference: ${reference}` : apiMessage,
        );
      } else {
        setError(apiMessage);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>Export Badges</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          LinkedIn and GitHub export require configured provider OAuth. Success
          is only shown after the destination accepts the export.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2 }}
          disabled={loading !== null}
          onClick={() => handleExport('linkedin')}
        >
          {loading === 'linkedin' ? 'Checking LinkedIn...' : 'Export to LinkedIn'}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={loading !== null}
          onClick={() => handleExport('github')}
        >
          {loading === 'github' ? 'Checking GitHub...' : 'Export to GitHub'}
        </Button>
        {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
        {info && <Alert severity="warning" sx={{ mt: 2 }}>{info}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Box>
    </Container>
  );
}
