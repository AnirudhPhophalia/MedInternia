import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import api from "../../utils/api";

export default function PeerReviewDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [review, setReview] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/peer-reviews/${id}`)
      .then((res) => {
        setReview(res.data.data.peerReview);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch peer review");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!review) return null;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              {review.title}
            </Typography>
            <Typography variant="body1">{review.description}</Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
