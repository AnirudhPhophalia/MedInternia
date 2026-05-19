import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, Tooltip } from '@mui/material';
import Link from 'next/link';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import PeopleIcon from '@mui/icons-material/People';

export default function DoctorCard({ doctor }: { doctor: any }) {
  const [connected, setConnected] = React.useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleConnect = async () => {
    try {
      await import('../utils/api').then(apiModule =>
        apiModule.default.post('/users/follow', { userId: doctor._id }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      setConnected(true);
    } catch (err) {
      alert('Failed to connect.');
    }
  };

  const mentorScore = doctor.mentorScore ?? 0;

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        border: '1px solid #e0eafc',
        boxShadow: '0 2px 12px #2193b022',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 6px 24px #2193b044', transform: 'translateY(-2px)' },
      }}
    >
      {/* Top accent bar */}
      <Box
        sx={{
          height: 5,
          background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      />
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
          <Box>
            <Typography
              variant="h6"
              component={Link}
              href={`/doctors/${doctor._id}`}
              sx={{ color: '#1565c0', fontWeight: 700, textDecoration: 'none', '&:hover': { color: '#2193b0' } }}
            >
              Dr. {doctor.firstName} {doctor.lastName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              {doctor.isVerifiedDoctor && (
                <Tooltip title="Verified Doctor">
                  <VerifiedIcon sx={{ color: '#2193b0', fontSize: 18 }} />
                </Tooltip>
              )}
              <Typography variant="body2" color="#555">
                {doctor.specialization}
              </Typography>
            </Box>
          </Box>
          {/* Mentor Score Badge */}
          <Tooltip title="Mentor Reputation Score">
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #e0f7fa 0%, #e0eafc 100%)',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                border: '1px solid #b0d8e8',
                minWidth: 60,
              }}
            >
              <StarIcon sx={{ color: '#2193b0', fontSize: 16 }} />
              <Typography fontSize={15} fontWeight={800} color="#1565c0" lineHeight={1.2}>
                {mentorScore}
              </Typography>
              <Typography fontSize={10} color="#2193b0" fontWeight={600}>
                MENTOR
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* Quick stats row */}
        <Box display="flex" gap={1.5} mb={1.5} flexWrap="wrap">
          {typeof doctor.casesPosted === 'number' && (
            <Chip
              size="small"
              label={`${doctor.casesPosted} cases`}
              sx={{ background: '#e0eafc', color: '#1565c0', fontWeight: 600, fontSize: 12 }}
            />
          )}
          {typeof doctor.internsTrainedCount === 'number' && (
            <Chip
              size="small"
              icon={<PeopleIcon sx={{ fontSize: 14 }} />}
              label={`${doctor.internsTrainedCount} interns`}
              sx={{ background: '#e0f7fa', color: '#007c91', fontWeight: 600, fontSize: 12 }}
            />
          )}
          {typeof doctor.experience === 'number' && doctor.experience > 0 && (
            <Chip
              size="small"
              label={`${doctor.experience} yrs exp`}
              sx={{ background: '#f3e5f5', color: '#6a1b9a', fontWeight: 600, fontSize: 12 }}
            />
          )}
        </Box>

        <Box display="flex" gap={1} mt={1}>
          <Button
            variant="contained"
            size="small"
            sx={{
              flex: 1,
              background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
              color: '#fff',
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': { background: 'linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)', boxShadow: '0 2px 8px #2193b044' },
            }}
            component={Link}
            href={`/profile/mentor-stats?id=${doctor._id}`}
          >
            View Stats
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              borderColor: '#2193b0',
              color: '#2193b0',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { background: '#e0f7fa', borderColor: '#1565c0' },
            }}
            disabled={connected}
            onClick={handleConnect}
          >
            {connected ? 'Connected' : 'Connect'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
