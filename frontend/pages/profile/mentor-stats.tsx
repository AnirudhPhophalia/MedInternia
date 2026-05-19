import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  Button,
  Card,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import ForumIcon from "@mui/icons-material/Forum";
import DownloadIcon from "@mui/icons-material/Download";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import api from "../../utils/api";

const TIER_THRESHOLDS = [
  { label: "Bronze Mentor", min: 0, color: "#cd7f32" },
  { label: "Silver Mentor", min: 50, color: "#9e9e9e" },
  { label: "Gold Mentor", min: 150, color: "#f9a825" },
  { label: "Platinum Mentor", min: 300, color: "#2193b0" },
  { label: "Elite Mentor", min: 500, color: "#7b1fa2" },
];

function getMentorTier(score: number) {
  let tier = TIER_THRESHOLDS[0];
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) tier = t;
  }
  return tier;
}

function ScorePill({ score }: { score: number }) {
  const tier = getMentorTier(score);
  const next = TIER_THRESHOLDS.find((t) => t.min > score);
  const progress = next
    ? Math.min(100, Math.round(((score - getMentorTier(score).min) / (next.min - getMentorTier(score).min)) * 100))
    : 100;

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #e0f7fa 0%, #e0eafc 100%)",
        borderRadius: 4,
        p: 3,
        textAlign: "center",
        border: "2px solid",
        borderColor: tier.color,
        maxWidth: 240,
        mx: "auto",
      }}
    >
      <StarIcon sx={{ color: tier.color, fontSize: 36 }} />
      <Typography variant="h2" fontWeight={900} color={tier.color} lineHeight={1}>
        {score}
      </Typography>
      <Typography fontWeight={700} fontSize={14} color={tier.color} mb={1}>
        {tier.label}
      </Typography>
      {next && (
        <>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              background: "#e0eafc",
              "& .MuiLinearProgress-bar": { background: tier.color },
            }}
          />
          <Typography fontSize={11} color="#888" mt={0.5}>
            {next.min - score} pts to {next.label}
          </Typography>
        </>
      )}
    </Box>
  );
}

function StatBox({ icon, label, value, color = "#2193b0" }: { icon: React.ReactNode; label: string; value: number | string; color?: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 140,
        background: "#fff",
        borderRadius: 3,
        p: 2.5,
        textAlign: "center",
        border: "1px solid #e0eafc",
        boxShadow: "0 2px 8px #2193b018",
      }}
    >
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h5" fontWeight={800} color={color}>
        {value}
      </Typography>
      <Typography fontSize={13} color="#888" fontWeight={500}>
        {label}
      </Typography>
    </Box>
  );
}

export default function MentorStatsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    api
      .get(`/users/${id}/mentor-stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setData(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load mentor stats.");
        setLoading(false);
      });
  }, [id]);

  const handleExport = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: "#2193b0" }} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box maxWidth={600} mx="auto" mt={6}>
        <Alert severity="error">{error || "Doctor not found."}</Alert>
      </Box>
    );
  }

  const { doctor, mentorStats, ranking, topCases } = data;
  const tier = getMentorTier(mentorStats.mentorScore);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e0eafc 0%, #cfdef3 100%)",
        py: 6,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box maxWidth={860} mx="auto">
        {/* Export button (hidden in print) */}
        <Box display="flex" justifyContent="flex-end" mb={2} className="no-print">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              background: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
              color: "#fff",
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: "0 2px 8px #2193b033",
              "&:hover": { background: "linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)" },
            }}
          >
            Export as PDF
          </Button>
        </Box>

        {/* Resume Card */}
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: "0 4px 32px #2193b033",
            border: "1px solid #e0eafc",
            overflow: "visible",
          }}
        >
          {/* Header gradient bar */}
          <Box
            sx={{
              background: "linear-gradient(90deg, #1565c0 0%, #2193b0 60%, #6dd5ed 100%)",
              px: 4,
              py: 3,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h4" fontWeight={900} color="#fff">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </Typography>
                  {mentorStats.isVerifiedDoctor && (
                    <Tooltip title="Verified Doctor">
                      <VerifiedIcon sx={{ color: "#b3e5fc", fontSize: 26 }} />
                    </Tooltip>
                  )}
                </Box>
                <Typography color="#b3e5fc" fontWeight={600} fontSize={16}>
                  {mentorStats.specialization} · {mentorStats.experience > 0 ? `${mentorStats.experience} years experience` : ""}
                </Typography>
                {doctor.bio && (
                  <Typography color="#e0f7fa" fontSize={14} mt={0.5} maxWidth={500}>
                    {doctor.bio}
                  </Typography>
                )}
              </Box>
              <Box ml="auto">
                <ScorePill score={mentorStats.mentorScore} />
              </Box>
            </Box>
          </Box>

          <Box px={4} py={3}>
            {/* Ranking */}
            <Box
              sx={{
                background: "linear-gradient(90deg, #e0f7fa 0%, #e0eafc 100%)",
                borderRadius: 3,
                px: 3,
                py: 2,
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <EmojiEventsIcon sx={{ color: tier.color, fontSize: 32 }} />
              <Box>
                <Typography fontWeight={800} fontSize={18} color="#1565c0">
                  Ranked #{ranking.current} among {ranking.total} doctors
                </Typography>
                <Typography fontSize={13} color="#2193b0">
                  Top {100 - ranking.percentile}% of all MedInternia doctors
                </Typography>
              </Box>
              <Chip
                label={tier.label}
                sx={{
                  ml: "auto",
                  background: tier.color,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  px: 1,
                }}
              />
            </Box>

            {/* Key Metrics */}
            <Typography variant="h6" fontWeight={800} color="#1565c0" mb={2}>
              Mentorship Metrics
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} flexWrap="wrap">
              <StatBox
                icon={<MedicalServicesIcon sx={{ fontSize: 28 }} />}
                label="Cases Posted"
                value={mentorStats.casesPosted}
                color="#1565c0"
              />
              <StatBox
                icon={<PeopleIcon sx={{ fontSize: 28 }} />}
                label="Interns Engaged"
                value={mentorStats.internsTrainedCount}
                color="#2193b0"
              />
              <StatBox
                icon={<ForumIcon sx={{ fontSize: 28 }} />}
                label="Discussions Generated"
                value={mentorStats.discussionUsageCount}
                color="#00838f"
              />
              <StatBox
                icon={<StarIcon sx={{ fontSize: 28 }} />}
                label="Mentoring Credits"
                value={mentorStats.mentoringCredits}
                color="#f9a825"
              />
            </Stack>

            {/* Score Breakdown */}
            <Typography variant="h6" fontWeight={800} color="#1565c0" mb={1.5}>
              Score Breakdown
            </Typography>
            <Box
              sx={{
                background: "#f8fafc",
                borderRadius: 3,
                p: 2.5,
                mb: 3,
                border: "1px solid #e0eafc",
              }}
            >
              {[
                { label: "Cases Posted", pts: mentorStats.casesPosted * 10, formula: `${mentorStats.casesPosted} × 10` },
                { label: "Interns Engaged", pts: mentorStats.internsTrainedCount * 15, formula: `${mentorStats.internsTrainedCount} × 15` },
                { label: "Discussion Activity", pts: mentorStats.discussionUsageCount * 2, formula: `${mentorStats.discussionUsageCount} × 2` },
              ].map((row) => (
                <Box key={row.label} display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography fontSize={14} color="#555" fontWeight={500}>
                    {row.label}
                    <Typography component="span" fontSize={12} color="#aaa" ml={1}>
                      ({row.formula})
                    </Typography>
                  </Typography>
                  <Typography fontWeight={700} color="#1565c0">
                    +{row.pts} pts
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography fontWeight={800} fontSize={16} color="#1565c0">
                  Total Mentor Score
                </Typography>
                <Typography fontWeight={900} fontSize={18} color="#2193b0">
                  {mentorStats.mentorScore} pts
                </Typography>
              </Box>
            </Box>

            {/* Top Cases */}
            {topCases?.length > 0 && (
              <>
                <Typography variant="h6" fontWeight={800} color="#1565c0" mb={1.5}>
                  Featured Cases
                </Typography>
                <Stack spacing={1.5} mb={2}>
                  {topCases.map((c: any) => (
                    <Box
                      key={c._id}
                      sx={{
                        background: "#fff",
                        borderRadius: 2,
                        px: 2.5,
                        py: 1.5,
                        border: "1px solid #e0eafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={700} color="#1565c0" fontSize={15}>
                          {c.title}
                        </Typography>
                        <Typography fontSize={12} color="#888">
                          {c.specialization} · {c.difficulty}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip size="small" label={`${c.commentCount} comments`} sx={{ background: "#e0f7fa", color: "#007c91" }} />
                        <Chip size="small" label={`${c.likeCount} likes`} sx={{ background: "#e0eafc", color: "#1565c0" }} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            {/* Footer */}
            <Divider sx={{ my: 2 }} />
            <Typography fontSize={12} color="#aaa" textAlign="center">
              MedInternia · Mentor Reputation Report · {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </Typography>
          </Box>
        </Card>
      </Box>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </Box>
  );
}
