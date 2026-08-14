import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Fab,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";

import api from "../utils/api";
import { quickActions } from "./chatbotData";

const Chatbot = ({ initialOpen = false }: { initialOpen?: boolean }) => {
  const router = useRouter();

  const [open, setOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<
  { sender: string; text: string }[]
>([
    {
      sender: "bot",
      text: "Welcome to MedInternia! How can I help you today?",
    },
  ]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage },
    ]);

    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chatbot", { message: userMessage });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply || "No response received." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I couldn't reach the AI service right now. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Fab
        color="primary"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close MedInternia assistant" : "Open MedInternia assistant"}
        aria-expanded={open}
        aria-controls="medinternia-chatbot-panel"
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </Fab>

      {/* Chat Window */}
      {open && (
        <Paper
          id="medinternia-chatbot-panel"
          role="dialog"
          aria-label="MedInternia assistant"
          elevation={5}
          sx={{
            position: "fixed",
            bottom: 90,
            right: 20,
            width: 350,
            height: 500,
            p: 2,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            MedInternia Assistant
          </Typography>

          <Box
            sx={{ flex: 1, overflowY: "auto", mt: 2 }}
            aria-live="polite"
            aria-busy={loading}
          >
            {messages.map((msg, index) => (
              <Typography
                key={index}
                sx={{
                  mb: 1,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <strong>{msg.sender}:</strong> {msg.text}
              </Typography>
            ))}
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={14} aria-label="AI is typing" />
                <Typography variant="caption">AI Assistant is typing...</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            {quickActions.map((item) => (
              <Button
                key={item.label}
                size="small"
                sx={{ mr: 1, mb: 1 }}
                onClick={() => router.push(item.route)}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask something..."
              inputProps={{ "aria-label": "Ask the MedInternia assistant" }}
              disabled={loading}
            />
            <Button variant="contained" onClick={sendMessage} disabled={loading}>
              Send
            </Button>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default Chatbot;
