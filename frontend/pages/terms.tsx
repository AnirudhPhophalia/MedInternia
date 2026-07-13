import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  IconButton
} from "@mui/material";
import {
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  Ban,
  Stethoscope,
  RefreshCcw,X
} from "lucide-react";
import { useRouter } from "next/router";

const sections = [
  {
    title: "Acceptable Use",
    icon: <UserCheck size={22} color="#0072ff" />,
    description:
      "Use MedInternia respectfully and only for learning, collaboration, networking, and professional development. Users are expected to maintain professionalism while interacting with others.",
  },
  {
    title: "Prohibited Activities",
    icon: <Ban size={22} color="#0072ff" />,
    description:
      "Do not upload harmful, misleading, offensive, illegal, or unauthorized content. Any misuse of the platform may result in account suspension or permanent removal.",
  },
  {
    title: "Community Guidelines",
    icon: <ShieldCheck size={22} color="#0072ff" />,
    description:
      "Respect fellow learners, mentors, healthcare professionals, and contributors. Harassment, discrimination, or abusive behavior is not tolerated.",
  },
  {
    title: "Medical Disclaimer",
    icon: <Stethoscope size={22} color="#0072ff" />,
    description:
      "Content available on MedInternia is intended for educational purposes only and should never replace professional medical advice, diagnosis, or treatment.",
  },
  {
    title: "Updates to These Terms",
    icon: <RefreshCcw size={22} color="#0072ff" />,
    description:
      "These Terms of Service may be updated periodically to reflect improvements, legal requirements, or platform changes. Continued use of the platform constitutes acceptance of the revised terms.",
  },
];

export default function TermsPage() {
   const router = useRouter(); 
  return (
    <Box
      sx={{
        flex: 1,
        background:
          "linear-gradient(120deg, #e0eafc 0%, #f8f9fa 100%)",
        py: { xs: 6, md: 10 },
      }}
    >
      
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 5,
            border: "1px solid rgba(33,147,176,0.12)",
            boxShadow: "0 12px 36px rgba(33,147,176,0.14)",
            position:'relative'
          }}
        >
            <IconButton
            onClick={() => router.back()}
            aria-label="close"
            sx={{
              position: "absolute",
              top: { xs: 16, md: 24 },
              right: { xs: 16, md: 24 },
              color: "text.secondary",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                color: "#0072ff",
                 backgroundColor: "rgba(0, 114, 255, 0.08)",
                transform: "scale(1.05)",
              
              },
            }}
          >
            <X size={22} />
          </IconButton>
          
          {/* Header */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ mb: 2 }}
          >
            
            <ClipboardCheck size={44} color="#0072ff" />

            <Typography
              variant="h2"
              fontWeight={900}
              color="#0072ff"
              sx={{
                fontSize: {
                  xs: "2.2rem",
                  md: "3.5rem",
                },
              }}
            >
              Terms of Service
            </Typography>
          </Stack>

          <Typography
            color="text.secondary"
            sx={{
              mb: 5,
              lineHeight: 1.8,
              fontSize: "1.05rem",
            }}
          >
            Please read these Terms of Service carefully before using
            MedInternia. By accessing or using the platform, you agree
            to comply with these terms and help maintain a safe,
            professional, and collaborative learning environment.
          </Typography>

          {/* Sections */}
          <Stack spacing={4}>
            {sections.map((section) => (
              <Paper
                key={section.title}
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: "#f1f9fc",
                  border: "1px solid rgba(33,147,176,0.08)",
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  {section.icon}

                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="text.primary"
                  >
                    {section.title}
                  </Typography>
                </Stack>

                <Typography
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.9,
                    fontSize: "1rem",
                  }}
                >
                  {section.description}
                </Typography>
              </Paper>
            ))}
          </Stack>

          {/* Footer */}
          <Typography
            sx={{
              mt: 5,
              textAlign: "center",
              color: "text.secondary",
              fontSize: "0.95rem",
            }}
          >
            <strong>Last Updated:</strong> June 2026
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
