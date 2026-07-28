import { useState } from "react";
import { Container, Typography, Button, Box, Alert } from "@mui/material";
import api from "../../utils/api";

export default function ExportBadges() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleExport = async (platform: "linkedin" | "github") => {
    setMessage("");
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/integration/${platform}/export`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Export failed");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Export Badges
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2 }}
          onClick={() => handleExport("linkedin")}
        >
          Export to LinkedIn
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => handleExport("github")}
        >
          Export to GitHub
        </Button>
        {message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Container>
  );
}
