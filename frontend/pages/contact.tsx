// GSSoC: Replaced MUI icons with Lucide SVG icons
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Mail, Phone, Hospital, Home, Search } from "lucide-react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getLoginHref, protectedLandingPaths } from "../utils/authRedirect";
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
  TextField,
} from "@mui/material";

export default function ContactPage() {
  const [formData, setFormData] = useState({
  name: "",
  email: "",
  phone: "",
  message: "",
});

const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value,
  });
};

const handleSubmit = () => {
  if (
    !formData.name.trim() ||
    !formData.email.trim() ||
    !formData.phone.trim()
  ) {
    alert("Please fill in your Name, Email, and Phone Number.");
    return;
  }

  // Backend/API logic goes here
  console.log(formData);
};
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsLoggedIn(!!token);
  }, []);

  const getAuthAwareHref = (path: string) =>
    !isLoggedIn && protectedLandingPaths.includes(path) ? getLoginHref(path) : path;

  return (
    <>
      <Box sx={{ px: { xs: 2, md: 6 }, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <Image src="/med-internia-logo.jpg" alt="MedInternia Logo" width={36} height={36} style={{ borderRadius: '50%' }} />
          <Typography variant="h6" fontWeight={800} color="#1a202c" ml={1}>MedInternia</Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
          {(isLoggedIn ? ['Cases', 'Jobs', 'Webinars', 'Leaderboard', 'About'] : ['Jobs', 'Webinars', 'Leaderboard', 'About']).map((item) => (
            <Link key={item} href={getAuthAwareHref(`/${item.toLowerCase()}`)} passHref legacyBehavior>
              <Typography component="a" fontWeight={600} color="#4a5568" sx={{ textDecoration: 'none', transition: 'all 0.2s', '&:hover': { color: '#0072ff', borderBottom: 'none !important', textDecoration: 'none' } }}>{item}</Typography>
            </Link>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <IconButton size="small"><Search size={20} color="#4a5568" /></IconButton>
          <Button variant="text" sx={{ color: '#0072ff', fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' }, '&:hover': { bgcolor: 'rgba(0,114,255,0.08)' } }} onClick={() => router.push('/auth/login')}>Log in</Button>
          <Button variant="contained" sx={{ bgcolor: '#0072ff', color: '#fff', borderRadius: '24px', px: { xs: 2, sm: 3 }, fontWeight: 700, textTransform: 'none', boxShadow: '0 4px 14px rgba(0,114,255,0.2)', '&:hover': { bgcolor: '#005bb5', boxShadow: '0 6px 20px rgba(0,114,255,0.3)', transform: 'translateY(-1px)' }, transition: 'all 0.2s ease-in-out' }} onClick={() => router.push('/auth/register')}>Sign Up</Button>
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          background: "linear-gradient(120deg, #e0eafc 0%, #f8f9fa 100%)",
          display: "flex",
          alignItems: "center",
          overflowX: "hidden",
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg" sx={{ width: "100%", px: { xs: 3, sm: 4 } }}>
         <Stack
  direction={{ xs: "column", md: "row" }}
  spacing={4}
  alignItems="flex-start"
>
  {/* Contact Form */}
  <Paper
    elevation={6}
    sx={{
      flex: 2,
      p: 5,
      borderRadius: 5,
      boxShadow: "0 12px 36px rgba(33,147,176,0.18)",
    }}
  >
    {/* Form Heading */}

    <Hospital size={42} color="#0072ff" />

    <Typography variant="h4" fontWeight={700} mt={2}>
      Contact Us
    </Typography>

    <Typography color="text.secondary" mt={1} mb={4}>
      Fill out the form below and our team will get back to you as soon as
      possible.
    </Typography>

    <Stack spacing={3}>
<TextField
  fullWidth
  name="name"
  label="Full Name *"
  value={formData.name}
  onChange={handleChange}
/>
<TextField
  fullWidth
  name="email"
  label="Email Address *"
  type="email"
  value={formData.email}
  onChange={handleChange}
/>

<TextField
  fullWidth
  name="phone"
  label="Phone Number *"
  value={formData.phone}
  onChange={handleChange}
/>
<TextField
  fullWidth
  multiline
  rows={5}
  name="message"
  label="Message"
  value={formData.message}
  onChange={handleChange}
/>

      <Button
        variant="contained"
          onClick={handleSubmit}
        sx={{
          py: 1.6,
          borderRadius: 8,
          background:
            "linear-gradient(90deg,#20d6b8 0%,#1976f3 100%)",
          fontWeight: 700,
          textTransform: "none",
          "&:hover": {
            background:
              "linear-gradient(90deg,#1976f3 0%,#20d6b8 100%)",
          },
        }}
      >
        Send Message
      </Button>
    </Stack>
  </Paper>

  {/* Contact Information */}
  <Paper
    elevation={6}
    sx={{
      flex: 1,
      p: 4,
      borderRadius: 5,
      boxShadow: "0 12px 36px rgba(33,147,176,0.18)",
      alignSelf: "flex-start",
    }}
  >
    <Typography variant="h5" fontWeight={700} mb={3}>
      Contact Information
    </Typography>

    <Typography
      color="text.secondary"
      sx={{ mb: 4 }}
    >
      You can also reach us directly through the following contact
      details.
    </Typography>

    <Stack spacing={3}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          bgcolor: "rgba(0,114,255,0.06)",
          borderRadius: 3,
        }}
      >
        <Mail color="#0072ff" />
        <Box>
          <Typography fontWeight={700}>
            Email
          </Typography>
          <Typography
            component="a"
            href="mailto:medinternia@gmail.com"
            sx={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            medinternia@gmail.com
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          bgcolor: "rgba(0,114,255,0.06)",
          borderRadius: 3,
        }}
      >
        <Phone color="#0072ff" />
        <Box>
          <Typography fontWeight={700}>
            Phone
          </Typography>
          <Typography
            component="a"
            href="tel:+918585858585"
            sx={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            +91 85858 58585
          </Typography>
        </Box>
      </Box>
    </Stack>
  </Paper>
</Stack>
        </Container>
      </Box>
    </>
  );
}
