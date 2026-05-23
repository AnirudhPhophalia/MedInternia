import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function Custom404() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
        textAlign: "center",
        px: 3,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: "6rem", md: "10rem" },
          fontWeight: 900,
          color: "#2193b0",
          lineHeight: 1,
          mb: 2,
        }}
      >
        404
      </Typography>

      <Typography
        variant="h5"
        fontWeight={700}
        color="text.primary"
        mb={1}
      >
        Page Not Found
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        mb={4}
        maxWidth={400}
      >
        Oops! The page you are looking for does not exist or has been moved.
      </Typography>

      <Button
        component={Link}
        href="/"
        variant="contained"
        size="large"
        sx={{
          borderRadius: 30,
          px: 5,
          py: 1.5,
          fontWeight: 700,
          fontSize: "1rem",
          background: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
          boxShadow: "0 4px 24px #2193b044",
          "&:hover": {
            background: "linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)",
          },
        }}
      >
        Back to Home
      </Button>
    </Box>
  );
}