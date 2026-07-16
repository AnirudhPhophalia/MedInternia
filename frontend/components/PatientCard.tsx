import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import Link from 'next/link';

export default function PatientCard({ patient }: { patient: any }) {
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';
  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 4,
        border: '1px solid #e3eafc',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: '#b9cff9',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar
            sx={{
              width: 52,
              height: 52,
              fontWeight: 800,
              bgcolor: '#e3f2fd',
              color: '#1565c0',
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component={Link}
              href={`/patients/${patient._id}`}
              sx={{
                color: '#1e293b',
                display: 'block',
                fontWeight: 800,
                lineHeight: 1.2,
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Patient profile
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.25} sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {patient.email || 'Email not provided'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <LocalPhoneOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {patient.phone || 'Phone not provided'}
            </Typography>
          </Stack>
        </Stack>

        <Button
          component={Link}
          href={`/patients/${patient._id}`}
          endIcon={<ArrowForwardIcon />}
          fullWidth
          variant="outlined"
          sx={{
            mt: 3,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          View profile
        </Button>
      </CardContent>
    </Card>
  );
}
