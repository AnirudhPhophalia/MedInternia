import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  SelectChangeEvent
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PageHeader from "../components/layout/PageHeader";
import api from "../utils/api";
import { hasAuthToken, redirectToLogin } from "../utils/authRedirect";

const AI_MODELS = [
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-2.0-pro", label: "Gemini 2.0 Pro" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" }
];

export default function Settings() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [preferredModel, setPreferredModel] = useState("gpt-3.5-turbo");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!hasAuthToken()) {
      redirectToLogin(router, "/settings");
      return;
    }
    setAuthChecked(true);

    // Load the current preference from localStorage (kept in sync after saves).
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (storedUser?.preferredModel) {
        setPreferredModel(storedUser.preferredModel);
      }
    } catch {
      // ignore malformed storage
    }
  }, [router]);

  const handleModelChange = (e: SelectChangeEvent) => {
    setPreferredModel(e.target.value);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put("/auth/profile", { preferredModel });
      if (res.data?.success) {
        const updatedUser = res.data.data?.user;
        if (updatedUser) {
          localStorage.setItem("user", JSON.stringify({ ...updatedUser }));
        }
        setMessage({ type: "success", text: "AI model preference saved." });
      } else {
        setMessage({ type: "error", text: "Could not save preference. Please try again." });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save preference."
      });
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, minHeight: "80vh" }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]}
      />

      <Card sx={{ borderRadius: 4, border: "1px solid #e3eafc", mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <SmartToyIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              AI Model Selection
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which AI model powers suggestions and insights across MedInternia.
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="preferred-model-label">Preferred AI Model</InputLabel>
            <Select
              labelId="preferred-model-label"
              label="Preferred AI Model"
              value={preferredModel}
              onChange={handleModelChange}
            >
              {AI_MODELS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {message && (
            <Alert severity={message.type} sx={{ mb: 2, borderRadius: 3 }}>
              {message.text}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {saving ? "Saving…" : "Save preference"}
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
