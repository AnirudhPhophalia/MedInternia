import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../utils/api";

type Prediction = {
  condition: string;
  confidence: number;
  matchedSignals: string[];
  rationale: string;
  afterEffects: string[];
  recommendations: string[];
  urgency: "routine" | "soon" | "urgent";
};

type InsightResponse = {
  isValid: boolean;
  validationErrors: string[];
  predictions: Prediction[];
  redFlags: string[];
  similarCaseSignals: Array<{
    diagnosis: string;
    matchedSignals: string[];
    confidenceBoost: number;
  }>;
  recommendedNextStep?: string;
  disclaimer: string;
};

const urgencyColor = {
  routine: "success",
  soon: "warning",
  urgent: "error",
} as const;

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MedicalInsights() {
  const [symptoms, setSymptoms] = useState("fever, cough, shortness of breath");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [notes, setNotes] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePredict = async () => {
    setLoading(true);
    setError("");
    setInsight(null);

    try {
      const response = await api.post("/medical-insights/predict", {
        symptoms: splitList(symptoms),
        patientContext: {
          age: age ? Number(age) : undefined,
          gender: gender || undefined,
          medicalHistory: splitList(medicalHistory),
          currentMedications: splitList(currentMedications),
        },
        notes,
      });

      setInsight(response.data.data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message ||
          "Unable to generate medical insight. Please check the symptom list and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={900} color="#1565c0" gutterBottom>
          Medical Insight Assistant
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 820 }}>
          Enter supervised case details to receive ranked educational
          hypotheses, red-flag checks, after-effect risks, and recommended next
          steps for discussion with a senior clinician.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 5fr) 7fr" },
          alignItems: "start",
        }}
      >
        <Box>
          <Card sx={{ borderRadius: 4, boxShadow: "0 8px 32px #1565c022" }}>
            <CardContent>
              <Stack spacing={2.5}>
                <TextField
                  label="Symptoms"
                  value={symptoms}
                  onChange={(event) => setSymptoms(event.target.value)}
                  helperText="Comma-separated symptoms. Add at least two."
                  multiline
                  minRows={3}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Age"
                    type="number"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Gender"
                    select
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                </Stack>
                <TextField
                  label="Medical history"
                  value={medicalHistory}
                  onChange={(event) => setMedicalHistory(event.target.value)}
                  helperText="Example: diabetes, asthma"
                  fullWidth
                />
                <TextField
                  label="Current medications"
                  value={currentMedications}
                  onChange={(event) =>
                    setCurrentMedications(event.target.value)
                  }
                  helperText="Example: insulin, inhaler"
                  fullWidth
                />
                <TextField
                  label="Case notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePredict}
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Generate Insight"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {insight && (
            <Stack spacing={3}>
              <Alert severity={insight.redFlags.length > 0 ? "error" : "info"}>
                {insight.recommendedNextStep || insight.disclaimer}
              </Alert>

              {insight.validationErrors.map((validationError) => (
                <Alert key={validationError} severity="warning">
                  {validationError}
                </Alert>
              ))}

              {insight.redFlags.length > 0 && (
                <Card sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={800} gutterBottom>
                      Red Flags
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {insight.redFlags.map((flag) => (
                        <Chip key={flag} color="error" label={flag} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {insight.predictions.map((prediction) => (
                <Card key={prediction.condition} sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      gap={2}
                      alignItems="flex-start"
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={900}>
                          {prediction.condition}
                        </Typography>
                        <Typography color="text.secondary">
                          {prediction.rationale}
                        </Typography>
                      </Box>
                      <Chip
                        color={urgencyColor[prediction.urgency]}
                        label={`${prediction.confidence}% ${prediction.urgency}`}
                      />
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Typography fontWeight={800}>Matched signals</Typography>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={1}
                        sx={{ mt: 1 }}
                      >
                        {prediction.matchedSignals.map((signal) => (
                          <Chip key={signal} label={signal} size="small" />
                        ))}
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        mt: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={800}>
                          After-effect risks
                        </Typography>
                        <ul>
                          {prediction.afterEffects.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </Box>
                      <Box>
                        <Typography fontWeight={800}>
                          Recommended support
                        </Typography>
                        <ul>
                          {prediction.recommendations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {insight.similarCaseSignals.length > 0 && (
                <Card sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={800} gutterBottom>
                      Similar Historical Case Signals
                    </Typography>
                    {insight.similarCaseSignals.map((signal) => (
                      <Alert
                        key={`${signal.diagnosis}-${signal.confidenceBoost}`}
                        severity="info"
                        sx={{ mb: 1 }}
                      >
                        {signal.diagnosis} matched{" "}
                        {signal.matchedSignals.join(", ")} ( +
                        {Math.round(signal.confidenceBoost * 100)}% confidence
                        support)
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Alert severity="warning">{insight.disclaimer}</Alert>
            </Stack>
          )}
        </Box>
      </Box>
    </Container>
  );
}
