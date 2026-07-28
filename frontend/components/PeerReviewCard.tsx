import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
} from "@mui/material";
import Link from "next/link";

export default function PeerReviewCard({ review }: { review: any }) {
  return (
    <Card sx={{ mb: 2, boxShadow: 2, borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar>{review.reviewer?.firstName?.[0]}</Avatar>
          <Box>
            <Typography
              variant="h6"
              component={Link}
              href={`/peer-reviews/${review._id}`}
            >
              Review for {review.reviewee?.firstName}{" "}
              {review.reviewee?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.feedback}
            </Typography>
            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              {review.tags?.map((tag: string) => (
                <Chip key={tag} label={tag} color="secondary" size="small" />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Rating: {review.rating}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
