import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneIcon from "@mui/icons-material/Phone";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

export default function ContactPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
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
          spacing={{ xs: 4, md: 8 }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: 320, sm: 520 },
              minWidth: 0,
            }}
          >
            <Typography
              variant="h2"
              fontWeight={900}
              color="#2193b0"
              sx={{
                fontSize: { xs: "2.2rem", sm: "3rem", md: "4.5rem" },
                lineHeight: 1.05,
                overflowWrap: "anywhere",
                maxWidth: "100%",
              }}
            >
              Contact MedInternia
            </Typography>
            <Typography
              variant="h5"
              color="#555"
              sx={{
                mt: 3,
                fontWeight: 500,
                lineHeight: 1.5,
                fontSize: { xs: "1.1rem", sm: "1.35rem", md: "1.5rem" },
                maxWidth: "100%",
                overflowWrap: "break-word",
                wordBreak: "normal",
              }}
            >
              Reach the team for platform support, collaboration queries, and medical learning opportunities.
            </Typography>
            <Button
              component={Link}
              href="/"
              variant="contained"
              startIcon={<HomeIcon />}
              sx={{
                mt: 4,
                borderRadius: 30,
                px: 4,
                py: 1.4,
                fontWeight: 700,
                background: "linear-gradient(90deg, #1de9b6 0%, #2193b0 100%)",
                boxShadow: "0 4px 24px #2193b044",
                "&:hover": {
                  background: "linear-gradient(90deg, #2193b0 0%, #1de9b6 100%)",
                },
              }}
            >
              Back to Home
            </Button>
          </Box>

          <Paper
            elevation={6}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              boxSizing: "border-box",
              borderRadius: 5,
              width: "100%",
              maxWidth: { xs: 320, sm: 500 },
              textAlign: "left",
              boxShadow: "0 12px 36px rgba(33,147,176,0.18)",
              border: "1px solid rgba(33,147,176,0.12)",
            }}
          >
            <Stack spacing={3}>
              <Box>
                <LocalHospitalIcon sx={{ color: "#2193b0", fontSize: 42, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  We are here to help
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Send us a message and the MedInternia team will get back to you.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "rgba(33,147,176,0.08)",
                  boxSizing: "border-box",
                  minWidth: 0,
                  width: "100%",
                }}
              >
                <EmailIcon color="primary" />
                <Typography
                  component="a"
                  href="mailto:medinternia@gmail.com"
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: 600,
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
                >
                  medinternia@gmail.com
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "rgba(33,147,176,0.08)",
                  boxSizing: "border-box",
                  minWidth: 0,
                  width: "100%",
                }}
              >
                <PhoneIcon color="primary" />
                <Typography
                  component="a"
                  href="tel:8585858585"
                  sx={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}
                >
                  8585858585
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
