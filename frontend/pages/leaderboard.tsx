import { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Container, Grid, Paper, Skeleton, Stack, Typography } from "@mui/material";
import Image from "next/image";
import { Award, Medal, Trophy } from "lucide-react";
import { useRouter } from "next/router";
import { hasAuthToken, redirectToLogin } from "../utils/authRedirect";
import { fetchTopContributors, GithubContributor } from "../utils/githubContributors";

export default function LeaderboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [contributors, setContributors] = useState<GithubContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    if (!hasAuthToken()) {
      redirectToLogin(router, "/leaderboard");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;
    fetchTopContributors(3)
      .then((data) => {
        if (!cancelled) setContributors(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

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

          {error && (
            <Typography color="text.secondary" textAlign="center">
              Couldn't load the leaderboard right now. Please try again later.
            </Typography>
          )}

          <Grid container spacing={3}>
            {(loading || error ? [1, 2, 3] : contributors).map((item, i) => {
              const rank = i + 1;

              if (loading) {
                return (
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
                      </Stack>
                    </Paper>
                  </Grid>
                );
              }

              if (error) {
                return (
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
                            bgcolor: "#f1f5f9",
                          }}
                        />
                        <Typography variant="h5" fontWeight={900}>
                          Rank #{rank}
                        </Typography>
                        <Chip label="Unavailable" variant="outlined" />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              }

              const contributor = item as GithubContributor;
              return (
                <Grid size={{ xs: 12, md: 4 }} key={contributor.login}>
                  <Paper
                    component="a"
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border: "1px solid rgba(33,147,176,0.12)",
                      boxShadow: "0 8px 24px rgba(33,147,176,0.10)",
                      height: "100%",
                      display: "block",
                      textDecoration: "none",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": { transform: "translateY(-3px)", boxShadow: "0 14px 32px rgba(33,147,176,0.18)" },
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
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={contributor.avatar_url}
                          alt={contributor.login}
                          width={70}
                          height={70}
                          style={{ borderRadius: "50%" }}
                          unoptimized
                        />
                      </Box>
                      <Typography variant="h5" fontWeight={900}>
                        Rank #{rank}
                      </Typography>
                      <Typography fontWeight={700}>{contributor.login}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contributor.contributions} contribution{contributor.contributions === 1 ? "" : "s"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}