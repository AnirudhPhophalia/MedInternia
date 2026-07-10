
import { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { Container, Typography, TextField, Button, Box, Alert, MenuItem, Card, Avatar, Fade, Grow, Stack, LinearProgress } from '@mui/material';
import api from '../../utils/api';
import { useRouter } from 'next/router';

const MEDICAL_SCHOOL_OPTIONS = [
  'All India Institute of Medical Sciences, New Delhi',
  'All India Institute of Medical Sciences, Bhopal',
  'All India Institute of Medical Sciences, Bhubaneswar',
  'All India Institute of Medical Sciences, Jodhpur',
  'All India Institute of Medical Sciences, Patna',
  'All India Institute of Medical Sciences, Raipur',
  'Armed Forces Medical College, Pune',
  'Atal Bihari Vajpayee Institute of Medical Sciences, New Delhi',
  'B. J. Medical College, Ahmedabad',
  'Bangalore Medical College and Research Institute, Bengaluru',
  'Christian Medical College, Vellore',
  'Government Medical College, Thiruvananthapuram',
  'Grant Medical College, Mumbai',
  'Institute of Medical Sciences, Banaras Hindu University',
  'Jawaharlal Institute of Postgraduate Medical Education and Research, Puducherry',
  'Kasturba Medical College, Manipal',
  'King George\'s Medical University, Lucknow',
  'Lady Hardinge Medical College, New Delhi',
  'Madras Medical College, Chennai',
  'Maulana Azad Medical College, New Delhi',
  'Postgraduate Institute of Medical Education and Research, Chandigarh',
  'Seth G. S. Medical College, Mumbai',
  'St. John\'s Medical College, Bengaluru',
  'Topiwala National Medical College, Mumbai',
  'University College of Medical Sciences, New Delhi',
];


export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    userType: 'patient',
    phone: '',
    dateOfBirth: '',
    gender: '',
    // Doctor fields
    specialization: '',
    licenseNumber: '',
    experience: '',
    qualifications: '',
    // Intern fields
    medicalSchool: '',
    yearOfStudy: '',
    interests: '',
    mentorDoctor: '',
    // Patient fields
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalHistory: '',
    allergies: '',
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const router = useRouter();
  // OTP verification states
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const selectedMedicalSchool = MEDICAL_SCHOOL_OPTIONS.find(
    (school) => school === form.medicalSchool
  ) || null;

  // For progress bar
  const requiredFieldsStep1: (keyof typeof form)[] = ['firstName', 'lastName', 'email', 'password', 'userType'];
  const requiredFieldsStep2: Record<string, (keyof typeof form)[]> = {
    doctor: ['specialization', 'licenseNumber'],
    intern: ['medicalSchool', 'yearOfStudy'],
    patient: [],
  };
  function getStep2Fields(): (keyof typeof form)[] {
    if (form.userType === 'doctor') return requiredFieldsStep2.doctor;
    if (form.userType === 'intern') return requiredFieldsStep2.intern;
    return [];
  }
  function getProgress() {
    if (step === 1) {
      const filled = requiredFieldsStep1.filter(f => form[f]);
      return Math.round((filled.length / requiredFieldsStep1.length) * 100);
    } else {
      const fields = getStep2Fields();
      if (fields.length === 0) return 100;
      const filled = fields.filter(f => form[f]);
      return Math.round((filled.length / fields.length) * 100);
    }
  }

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Email change triggers OTP send
  // const handleEmailChange = async (e: any) => {
  //   handleChange(e);
  //   setEmailVerified(false);
  //   setOtp('');
  //   setOtpError('');
  //   if (e.target.value && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.target.value)) {
  //     setSendingOtp(true);
  //     try {
  //       const res = await fetch('http://localhost:3000/api/auth/send-otp', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ email: e.target.value })
  //       });
  //       const data = await res.json();
  //       if (data.success) {
  //         setOtpModalOpen(true);
  //       } else {
  //         setOtpError(data.message || 'Failed to send OTP');
  //       }
  //     } catch (err) {
  //       setOtpError('Failed to send OTP');
  //     }
  //     setSendingOtp(false);
  //   }
  // };
  const handleEmailChange = (e: any) => {
    handleChange(e);
    // Email verification logic skipped
  };

  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    setOtpError('');
    try {
  const res = await fetch('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp })
      });
      const data = await res.json();
      if (data.success) {
        setEmailVerified(true);
        setOtpModalOpen(false);
      } else {
        setOtpError('Invalid OTP');
      }
    } catch (err) {
      setOtpError('Verification failed');
    }
    setVerifyingOtp(false);
  };


  const handleNext = (e: any) => {
    e.preventDefault();
    setError('');
    // Check all required fields in step 1 are filled
    const missing = requiredFieldsStep1.filter(f => !form[f]);
    if (missing.length > 0) {
      setError('Please fill all required fields.');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (form.userType === 'intern' && !MEDICAL_SCHOOL_OPTIONS.includes(form.medicalSchool)) {
      setError('Please select a valid medical school from the list.');
      return;
    }
    // Check all required fields in step 2 are filled
    const fields = getStep2Fields();
    const missing = fields.filter(f => !form[f]);
    if (missing.length > 0) {
      setError('Please fill all required fields.');
      return;
    }
    try {
      await api.post('/auth/register', form);
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 6
    }}>
      <Fade in timeout={900}>
        <Card elevation={8} sx={{ p: 4, borderRadius: 5, minWidth: 370, maxWidth: 450, width: '100%', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'white', width: 80, height: 80, mb: 1, boxShadow: 3 }}>
              <img src="/med-internia-logo.jpg" alt="MedInternia Logo" style={{ width: '100%', height: '100%' }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              Join MedInternia
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 1 }}>
              Create your account and start your journey in the medical community.
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {/* Loader removed as requested */}
          <form onSubmit={step === 1 ? handleNext : handleSubmit}>
            <Grow in timeout={700}>
              <Box>
                {step === 1 && (
                  <>
                    <TextField label="First Name" name="firstName" fullWidth margin="normal" value={form.firstName} onChange={handleChange} required autoFocus />
                    <TextField label="Last Name" name="lastName" fullWidth margin="normal" value={form.lastName} onChange={handleChange} required />
                    <TextField label="Email" name="email" type="email" fullWidth margin="normal" value={form.email} onChange={handleChange} required />
                    <TextField label="Password" name="password" type="password" fullWidth margin="normal" value={form.password} onChange={handleChange} required />
                    <TextField select label="User Type" name="userType" fullWidth margin="normal" value={form.userType} onChange={handleChange} required>
                      <MenuItem value="patient">Patient</MenuItem>
                      <MenuItem value="doctor">Doctor</MenuItem>
                      <MenuItem value="intern">Intern</MenuItem>
                    </TextField>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ mt: 2, py: 1.3, fontWeight: 700, fontSize: '1.1rem', borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.10)', transition: 'all 0.2s', '&:hover': { background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)', transform: 'scale(1.03)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' } }}
                    >
                      Next
                    </Button>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <span style={{ color: '#888', fontSize: 15 }}>Already registered? </span>
                      <Button variant="text" color="primary" size="small" sx={{ fontWeight: 700, textTransform: 'none', fontSize: 15, ml: 0.5, p: 0 }} onClick={() => window.location.href = '/auth/login'}>
                        Login
                      </Button>
                    </Box>
                  </>
                )}
                {step === 2 && (
                  <>
                    <TextField label="Phone" name="phone" fullWidth margin="normal" value={form.phone} onChange={handleChange} />
                    <TextField label="Date of Birth" name="dateOfBirth" type="date" fullWidth margin="normal" value={form.dateOfBirth} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    <TextField select label="Gender" name="gender" fullWidth margin="normal" value={form.gender} onChange={handleChange}>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>

                      {/* Doctor-specific fields */}
                      {form.userType === 'doctor' && (
                        <Fade in timeout={600}>
                          <Box>
                            <TextField label="Specialization" name="specialization" fullWidth margin="normal" value={form.specialization} onChange={handleChange} required />
                            <TextField label="License Number" name="licenseNumber" fullWidth margin="normal" value={form.licenseNumber} onChange={handleChange} required />
                            <TextField label="Experience (years)" name="experience" type="number" fullWidth margin="normal" value={form.experience} onChange={handleChange} />
                            <TextField label="Qualifications (comma separated)" name="qualifications" fullWidth margin="normal" value={form.qualifications} onChange={handleChange} />
                          </Box>
                        </Fade>
                      )}

                      {/* Intern-specific fields */}
                      {form.userType === 'intern' && (
                        <Fade in timeout={600}>
                          <Box>
                            <Autocomplete
                              options={MEDICAL_SCHOOL_OPTIONS}
                              value={selectedMedicalSchool}
                              onChange={(_, value) => {
                                setForm({ ...form, medicalSchool: value || '' });
                              }}
                              isOptionEqualToValue={(option, value) => option === value}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Medical School"
                                  name="medicalSchool"
                                  fullWidth
                                  margin="normal"
                                  required
                                  helperText="Search and select a medical school from the list"
                                />
                              )}
                            />
                            <TextField label="Year of Study" name="yearOfStudy" type="number" fullWidth margin="normal" value={form.yearOfStudy} onChange={handleChange} required />
                            <TextField label="Interests (comma separated)" name="interests" fullWidth margin="normal" value={form.interests} onChange={handleChange} />
                            <TextField label="Mentor Doctor ID (optional)" name="mentorDoctor" fullWidth margin="normal" value={form.mentorDoctor} onChange={handleChange} />
                          </Box>
                        </Fade>
                      )}

                    {/* Patient-specific fields */}
                    {form.userType === 'patient' && (
                      <Fade in timeout={600}>
                        <Box>
                          <TextField label="Emergency Contact Name" name="emergencyContactName" fullWidth margin="normal" value={form.emergencyContactName} onChange={handleChange} />
                          <TextField label="Emergency Contact Phone" name="emergencyContactPhone" fullWidth margin="normal" value={form.emergencyContactPhone} onChange={handleChange} />
                          <TextField label="Emergency Contact Relationship" name="emergencyContactRelationship" fullWidth margin="normal" value={form.emergencyContactRelationship} onChange={handleChange} />
                          <TextField label="Medical History (comma separated)" name="medicalHistory" fullWidth margin="normal" value={form.medicalHistory} onChange={handleChange} />
                          <TextField label="Allergies (comma separated)" name="allergies" fullWidth margin="normal" value={form.allergies} onChange={handleChange} />
                        </Box>
                      </Fade>
                    )}
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button variant="outlined" color="primary" onClick={handleBack} sx={{ flex: 1, py: 1.3, fontWeight: 700, fontSize: '1.1rem', borderRadius: 3 }}>Back</Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        sx={{
                          flex: 1,
                          py: 1.3,
                          fontWeight: 800,
                          fontSize: '1.13rem',
                          borderRadius: 3,
                          letterSpacing: 1,
                          background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
                          boxShadow: '0 4px 20px 0 rgba(33,147,176,0.13)',
                          transition: 'all 0.18s',
                          textTransform: 'uppercase',
                          '&:hover': {
                            background: 'linear-gradient(90deg, #1565c0 0%, #2193b0 100%)',
                            transform: 'scale(1.04)',
                            boxShadow: '0 8px 32px 0 rgba(33,147,176,0.18)'
                          }
                        }}
                      >
                        Register
                      </Button>
                    </Stack>
                  </>
                )}
              </Box>
            </Grow>
          </form>
        </Card>
      </Fade>
    </Box>
  );
}
