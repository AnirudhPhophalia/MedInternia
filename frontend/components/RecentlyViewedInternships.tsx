import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRecentlyViewedInternships } from "../hooks/useRecentlyViewedInternships";

/**
 * Shows the internships a user has recently opened, sourced entirely from
 * localStorage (see useRecentlyViewedInternships). Renders nothing if there
 * is no history yet, so it can be safely dropped onto any page.
 */
export default function RecentlyViewedInternships() {
  const { items, clearRecentlyViewed } = useRecentlyViewedInternships();

  if (items.length === 0) return null;

  return (
    <Box sx={{ my: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5" fontWeight={800} color="#1565c0">
          Recently Viewed Internships
        </Typography>
        <Button
          size="small"
          color="inherit"
          onClick={clearRecentlyViewed}
          sx={{ textTransform: "none", fontWeight: 600, color: "#666" }}
        >
          Clear History
        </Button>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          overflowX: "auto",
          pb: 1,
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#bdbdbd",
            borderRadius: 3,
          },
        }}
      >
        {items.map((job) => (
          <Card
            key={job._id}
            component={Link}
            href={`/jobs/${job._id}`}
            sx={{
              minWidth: 240,
              maxWidth: 240,
              flex: "0 0 auto",
              textDecoration: "none",
              borderRadius: 3,
              boxShadow: "0 2px 12px #2193b022",
              background: "linear-gradient(120deg, #f8f9fa 0%, #e0eafc 100%)",
              transition: "box-shadow 0.2s, transform 0.2s",
              "&:hover": {
                boxShadow: "0 6px 24px #2193b044",
                transform: "scale(1.02)",
              },
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                <Avatar
                  src={job.logo}
                  alt={job.company || job.title}
                  sx={{ bgcolor: "#2193b0", width: 36, height: 36 }}
                >
                  {(job.company || job.title || "?").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    fontWeight={700}
                    color="#1565c0"
                    noWrap
                    title={job.title}
                  >
                    {job.title}
                  </Typography>
                  {job.company ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      title={job.company}
                    >
                      {job.company}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
              {job.location ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {job.location}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
