import { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Container, Grid, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Award, Medal, Trophy } from "lucide-react";
import { useRouter } from "next/router";
import { hasAuthToken, redirectToLogin } from "../utils/authRedirect";

const upcomingRanks = [1, 2, 3];

export default function LeaderboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    if (!hasAuthToken()) {
      redirectToLogin(router, "/leaderboard");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  if (!authChecked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, background: "linear-gradient(120deg, #e0eafc 0%, #f8f9fa 100%)", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 5,
              border: "1px solid rgba(33,147,176,0.12)",
              boxShadow: "0 12px 36px rgba(33,147,176,0.14)",
              textAlign: "center",
            }}
          >
            <Trophy size={54} color="#d97706" />
            <Typography variant="h2" fontWeight={900} color="#0072ff" sx={{ fontSize: { xs: "2.4rem", md: "4rem" }, mt: 2 }}>
              Leaderboard
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
              Track top contributors and celebrate active learning across MedInternia.
            </Typography>
          </Paper>

          <Grid container spacing={3}>
            {upcomingRanks.map((rank) => (
              <Grid size={{ xs: 12, md: 4 }} key={rank}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    border: "1px solid rgba(33,147,176,0.12)",
                    boxShadow: "0 8px 24px rgba(33,147,176,0.10)",
                    height: "100%",
                  }}
                >
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: "50%",
                        bgcolor: rank === 1 ? "#fffbeb" : "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {rank === 1 ? <Medal size={34} color="#d97706" /> : <Award size={34} color="#0072ff" />}
                    </Box>
                    <Typography variant="h5" fontWeight={900}>
                      Rank #{rank}
                    </Typography>
                    <Skeleton variant="text" width="70%" height={28} animation="wave" />
                    <Skeleton variant="text" width="46%" height={22} animation="wave" />
                    <Chip label="Coming Soon" color="primary" variant="outlined" />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
