import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import { Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import { useRouter } from "next/router";
import api from "../../utils/api";

export default function ResetPassword() {
  const router = useRouter();
  const { email } = router.query;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const getStrength = () => {
    let score = 0;

    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*]/.test(newPassword)) score++;

    return score;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      setSuccess("Password reset successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#e0eafc,#cfdef3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: 5,
      }}
    >
      <Fade in timeout={800}>
        <Card
          elevation={8}
          sx={{
            width: "100%",
            maxWidth: 430,
            p: 4,
            borderRadius: 4,
          }}
        >
          <Typography
            variant="h4"
            align="center"
            fontWeight="bold"
            color="primary"
          >
            Reset Password
          </Typography>

          <Typography
            align="center"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Enter the OTP sent to your email and create a new password.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="OTP"
              margin="normal"
              value={otp}
              inputProps={{ maxLength: 6 }}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),

                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                    >
                      {showPassword ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="body2"
              sx={{ mt: 2 }}
            >
              Password Strength
            </Typography>

            <LinearProgress
              variant="determinate"
              value={getStrength() * 20}
              sx={{
                height: 8,
                borderRadius: 5,
                mb: 3,
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: "bold",
                borderRadius: 3,
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Card>
      </Fade>
    </Box>
  );
}
