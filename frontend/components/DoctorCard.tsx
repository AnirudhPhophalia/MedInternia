import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function DoctorCard({ doctor }: { doctor: any }) {
  const [connected, setConnected] = React.useState(false);

  const handleConnect = async () => {
    try {
      await import('../utils/api').then(apiModule =>
        apiModule.default.post('/users/follow', { userId: doctor._id })
      );
      setConnected(true);
    } catch (err) {
      alert('Failed to connect.');
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component={Link} href={`/doctors/${doctor._id}`}>{doctor.firstName} {doctor.lastName}</Typography>
        <Typography variant="body2">Specialization: {doctor.specialization}</Typography>
        <Typography variant="body2">Email: {doctor.email}</Typography>
        <Button
          variant="contained"
          color="success"
          sx={{ mt: 2, width: '100%' }}
          disabled={connected}
          onClick={handleConnect}
        >
          {connected ? 'Connected' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  );
}
