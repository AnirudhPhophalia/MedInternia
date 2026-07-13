import { Card, CardContent, Typography, Button, Box } from "@mui/material";
import Link from "next/link";
import DeadlineCountdown from "./DeadlineCountdown";
import BookmarkButton from "./BookmarkButton";

export default function JobCard({ job }: { job: any }) {
  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: 3,
        background: "linear-gradient(120deg, #f8f9fa 0%, #e0eafc 100%)",
        boxShadow: "0 2px 12px #0072ff22",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": {
          boxShadow: "0 6px 24px #0072ff44",
          transform: "scale(1.02)",
        },
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <CardContent sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="#0056cc"
                gutterBottom
                component={Link}
                href={`/jobs/${job._id}`}
                sx={{
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {job.title}
              </Typography>
              <BookmarkButton itemType="job" itemId={job._id} />
            </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {job.description}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <DeadlineCountdown deadline={job.applicationDeadline} />
        </Box>
        <Button
          variant="contained"
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)",
            color: "#fff",
            boxShadow: "0 1px 4px #0072ff22",
            mt: 1,
            "&:hover": {
              background: "linear-gradient(90deg, #6dd5ed 0%, #0072ff 100%)",
              color: "#fff",
              boxShadow: "0 2px 8px #0072ff44",
            },
          }}
          component={Link}
          href={`/jobs/${job._id}`}
        >
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}

