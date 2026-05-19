import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Stack,
  Avatar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import StarIcon from "@mui/icons-material/Star";
import VerifiedIcon from "@mui/icons-material/Verified";
import api from "../utils/api";
import Link from "next/link";

const MEDAL_COLORS: Record<number, string> = {
  1: "#f9a825",
  2: "#9e9e9e",
  3: "#cd7f32",
};

const DOCTOR_METRICS = [
  { value: "mentorScore", label: "Mentor Score" },
  { value: "casesPosted", label: "Cases Posted" },
  { value: "points", label: "Points" },
  { value: "averageRating", label: "Avg Rating" },
];

const INTERN_METRICS = [
  { value: "points", label: "Points" },
  { value: "casesAnalyzed", label: "Cases Analyzed" },
  { value: "upvotesReceived", label: "Upvotes" },
  { value: "averageRating", label: "Avg Rating" },
  { value: "streak", label: "Streak" },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"doctor" | "intern">("doctor");
  const [doctorMetric, setDoctorMetric] = useState("mentorScore");
  const [internMetric, setInternMetric] = useState("points");
  const [doctorBoard, setDoctorBoard] = useState<any[]>([]);
  const [internBoard, setInternBoard] = useState<any[]>([]);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [loadingIntern, setLoadingIntern] = useState(false);
  const [error, setError] = useState("");

  const fetchLeaderboard = async (userType: string, metric: string, setter: (d: any[]) => void, loadSetter: (b: boolean) => void) => {
    loadSetter(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await api.get(`/users/leaderboard?userType=${userType}&metric=${metric}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setter(res.data.data?.leaderboard ?? []);
    } catch {
      setError("Failed to load leaderboard.");
    } finally {
      loadSetter(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard("doctor", doctorMetric, setDoctorBoard, setLoadingDoctor);
  }, [doctorMetric]);

  useEffect(() => {
    fetchLeaderboard("intern", internMetric, setInternBoard, setLoadingIntern);
  }, [internMetric]);

  const activeBoard = tab === "doctor" ? doctorBoard : internBoard;
  const loading = tab === "doctor" ? loadingDoctor : loadingIntern;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e0eafc 0%, #cfdef3 100%)",
        py: 6,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box maxWidth={800} mx="auto">
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <EmojiEventsIcon sx={{ color: "#f9a825", fontSize: 48, mb: 1 }} />
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              background: "linear-gradient(90deg, #1565c0 0%, #2193b0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Leaderboard
          </Typography>
          <Typography color="text.secondary" mt={1}>
            Recognising the top contributors on MedInternia
          </Typography>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 2px 12px #2193b022",
            mb: 3,
            border: "1px solid #e0eafc",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              "& .MuiTab-root": { fontWeight: 700, fontSize: 15 },
              "& .MuiTabs-indicator": { background: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)", height: 3, borderRadius: 2 },
              "& .Mui-selected": { color: "#2193b0 !important" },
            }}
          >
            <Tab value="doctor" label="Doctors" />
            <Tab value="intern" label="Interns" />
          </Tabs>
        </Box>

        {/* Metric selector */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontWeight: 600 }}>Sort by</InputLabel>
            <Select
              value={tab === "doctor" ? doctorMetric : internMetric}
              label="Sort by"
              onChange={(e) =>
                tab === "doctor" ? setDoctorMetric(e.target.value) : setInternMetric(e.target.value)
              }
              sx={{ borderRadius: 2, fontWeight: 600, background: "#fff" }}
            >
              {(tab === "doctor" ? DOCTOR_METRICS : INTERN_METRICS).map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress sx={{ color: "#2193b0" }} />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {activeBoard.map((user: any, idx: number) => {
              const rank = idx + 1;
              const medal = MEDAL_COLORS[rank];
              const metricValue = tab === "doctor" ? doctorMetric : internMetric;
              const displayValue = user[metricValue] ?? 0;

              return (
                <Box
                  key={user._id}
                  component={tab === "doctor" ? Link : "div"}
                  href={tab === "doctor" ? `/profile/mentor-stats?id=${user._id}` : "#"}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    background: rank <= 3 ? "linear-gradient(90deg, #fffde7 0%, #fff8e1 100%)" : "#fff",
                    border: "1px solid",
                    borderColor: medal ?? "#e0eafc",
                    borderRadius: 3,
                    px: 2.5,
                    py: 1.5,
                    boxShadow: rank <= 3 ? "0 2px 12px #f9a82533" : "0 1px 4px #2193b011",
                    textDecoration: "none",
                    transition: "box-shadow 0.2s, transform 0.2s",
                    "&:hover": { boxShadow: "0 4px 20px #2193b033", transform: "translateY(-1px)" },
                  }}
                >
                  {/* Rank */}
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: medal ? medal : "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {rank <= 3 ? (
                      <EmojiEventsIcon sx={{ color: "#fff", fontSize: 20 }} />
                    ) : (
                      <Typography fontWeight={800} color="#2193b0" fontSize={14}>
                        {rank}
                      </Typography>
                    )}
                  </Box>

                  {/* Avatar */}
                  <Avatar
                    src={user.profilePicture}
                    sx={{ width: 44, height: 44, border: "2px solid", borderColor: medal ?? "#e0eafc" }}
                  >
                    {user.firstName?.[0]}
                  </Avatar>

                  {/* Name & role */}
                  <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography fontWeight={700} color="#1565c0" fontSize={15} noWrap>
                        {tab === "doctor" ? "Dr. " : ""}{user.firstName} {user.lastName}
                      </Typography>
                      {user.isVerifiedDoctor && (
                        <Tooltip title="Verified Doctor">
                          <VerifiedIcon sx={{ color: "#2193b0", fontSize: 16 }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Typography fontSize={12} color="#888" noWrap>
                      {user.specialization || user.medicalSchool || ""}
                    </Typography>
                  </Box>

                  {/* Score */}
                  <Box textAlign="right" flexShrink={0}>
                    <Box display="flex" alignItems="center" gap={0.5} justifyContent="flex-end">
                      {metricValue === "mentorScore" && <StarIcon sx={{ color: "#f9a825", fontSize: 16 }} />}
                      <Typography fontWeight={800} color="#1565c0" fontSize={18}>
                        {typeof displayValue === "number" ? displayValue.toFixed(metricValue === "averageRating" ? 1 : 0) : displayValue}
                      </Typography>
                    </Box>
                    <Typography fontSize={11} color="#2193b0" fontWeight={600}>
                      {(tab === "doctor" ? DOCTOR_METRICS : INTERN_METRICS).find((m) => m.value === metricValue)?.label}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {activeBoard.length === 0 && !loading && (
              <Box textAlign="center" py={6}>
                <Typography color="text.secondary">No data available yet.</Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
