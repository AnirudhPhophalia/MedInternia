import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../utils/api';

type DiseasePrediction = {
  condition: string;
  specialty: string;
  confidence: number;
  matchedSymptoms: string[];
  reasoning: string[];
  afterEffects: string[];
  recommendations: string[];
  redFlags: string[];
  urgent: boolean;
};

export default function DiseaseInsightAssistant() {
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [predictions, setPredictions] = useState<DiseasePrediction[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setPredictions([]);

    try {
      const response = await api.post('/ai-disease-insights/predict', {
        symptoms,
        age: age ? Number(age) : undefined,
        duration,
        notes,
      });
      setPredictions(response.data.data.predictions || []);
      setDisclaimer(response.data.data.disclaimer || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 5 }}>
        <Typography variant="h4" gutterBottom>
          AI Disease Insight Assistant
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Enter symptoms to generate ranked differential insights for supervised medical learning.
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Symptoms"
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                multiline
                minRows={3}
                placeholder="fever, cough, chest pain, shortness of breath"
                fullWidth
              />
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
                }}
              >
                <Box>
                  <TextField
                    label="Age"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    type="number"
                    fullWidth
                  />
                </Box>
                <Box>
                  <TextField
                    label="Duration"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    placeholder="3 days, sudden onset, recurring for 2 weeks"
                    fullWidth
                  />
                </Box>
              </Box>
              <TextField
                label="Clinical notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Button variant="contained" onClick={handlePredict} disabled={loading}>
                Generate Insights
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {disclaimer && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {disclaimer}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {predictions.map((prediction) => (
            <Box key={prediction.condition}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                    <Chip label={prediction.specialty} size="small" />
                    <Chip
                      label={`${Math.round(prediction.confidence * 100)}% confidence`}
                      color={prediction.urgent ? 'error' : 'primary'}
                      size="small"
                    />
                    {prediction.urgent && <Chip label="Red flag" color="error" size="small" />}
                  </Stack>
                  <Typography variant="h6" gutterBottom>
                    {prediction.condition}
                  </Typography>
                  <Typography variant="subtitle2">Matched symptoms</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    {prediction.matchedSymptoms.join(', ') || 'No direct matches'}
                  </Typography>
                  <Typography variant="subtitle2">Reasoning</Typography>
                  <ul>
                    {prediction.reasoning.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Typography variant="subtitle2">Recommendations</Typography>
                  <ul>
                    {prediction.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Typography variant="subtitle2">Possible after-effects</Typography>
                  <Typography color="text.secondary">{prediction.afterEffects.join(', ')}</Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
