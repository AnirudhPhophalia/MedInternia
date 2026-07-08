import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Award, Medal, Trophy } from "lucide-react";
import { useRouter } from "next/router";
import { hasAuthToken, redirectToLogin } from "../utils/authRedirect";
import { getLeaderboard } from "../utils/api";

interface LeaderboardUser {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  points: number;
  rank: number;
  medicalSchool?: string;
  specialization?: string;
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy size={30} color="#d97706" />;
  if (rank === 2) return <Medal size={30} color="#64748b" />;
  if (rank === 3) return <Medal size={30} color="#b45309" />;
  return <Award size={26} color="#0072ff" />;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "#fffbeb";
  if (rank === 2) return "#f8fafc";
  if (rank === 3) return "#fff7ed";
  return "#eff6ff";
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getLeaderboard({ userType: "intern", limit: 10 });
        if (!cancelled) {
          setUsers(data?.data?.leaderboard ?? []);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        if (!cancelled) {
          setError("Couldn't load the leaderboard right now. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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

          {loading && (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          )}

          {!loading && error && (
            <Typography align="center" color="error">
              {error}
            </Typography>
          )}

          {!loading && !error && users.length === 0 && (
            <Typography align="center" color="text.secondary">
              No ranked interns yet — be the first to earn points!
            </Typography>
          )}

          {!loading && !error && users.length > 0 && (
            <Grid container spacing={3}>
              {users.map((user) => (
                <Grid size={{ xs: 12, md: 4 }} key={user._id}>
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
                          bgcolor: rankBg(user.rank),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {rankIcon(user.rank)}
                      </Box>
                      <Typography variant="h5" fontWeight={900}>
                        Rank #{user.rank}
                      </Typography>
                      <Avatar src={user.profilePicture} sx={{ width: 48, height: 48 }}>
                        {user.firstName?.[0]}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      {(user.specialization || user.medicalSchool) && (
                        <Typography variant="body2" color="text.secondary">
                          {user.specialization || user.medicalSchool}
                        </Typography>
                      )}
                      <Chip
                        label={`${user.points} pts`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
