import { useRef, useState } from "react";
import { Container, Typography, Button, Box, Alert } from "@mui/material";

export default function VideoConference() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  // This is a stub for demo purposes. In production, use WebRTC and backend signaling.
  const handleStart = () => {
    setStarted(true);
    setError("");
    // Demo: Show local video
    if (navigator.mediaDevices && localVideoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localVideoRef.current!.srcObject = stream;
        })
        .catch(() => setError("Could not access camera/microphone"));
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Live Video Conference
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStart}
          disabled={started}
        >
          Start Conference
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
          <Box>
            <Typography variant="subtitle1">Your Video</Typography>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              style={{ width: 320, height: 240, background: "#000" }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle1">Remote Video</Typography>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: 320, height: 240, background: "#000" }}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
