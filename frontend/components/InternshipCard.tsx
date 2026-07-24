import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import Link from "next/link";
import {
  Building2,
  Stethoscope,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import BookmarkButton from "./BookmarkButton";

export interface InternshipOpportunity {
  _id?: string;
  id?: string;
  title?: string;
  hospitalName?: string;
  company?: string;
  specialty?: string;
  specialization?: string;
  duration?: string;
  location?: string | { city?: string; state?: string; country?: string; isRemote?: boolean };
  salary?: string | { min?: number; max?: number; currency?: string };
  applicationDeadline?: string;
  status?: string;
  description?: string;
  postedBy?: string | { _id: string; name?: string };
  matchPercentage?: number;
}

export interface InternshipCardProps {
  internship?: InternshipOpportunity;
  onApply?: (internship: InternshipOpportunity) => void;
  isApplied?: boolean;
  isSaved?: boolean;
  onToggleSave?: (internship: InternshipOpportunity) => void;
}

export default function InternshipCard({
  internship = {},
  onApply,
  isApplied = false,
}: InternshipCardProps) {
  // Placeholder default data when specific props are omitted
  const id = internship._id || internship.id || "sample-internship-1";
  const title = internship.title || "Clinical Cardiology Internship";
  const hospitalName =
    internship.hospitalName || internship.company || "Metropolitan General Hospital";
  const specialty =
    internship.specialty || internship.specialization || "Cardiology";
  const duration = internship.duration || "6 Months";

  // Location string formatting
  const formatLocation = (loc: any) => {
    if (!loc) return "New York, NY";
    if (typeof loc === "string") return loc;
    if (loc.isRemote) return "Remote";
    const parts = [loc.city, loc.state, loc.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "New York, NY";
  };

  const locationText = formatLocation(internship.location);
  const matchPercentage = internship.matchPercentage;
  const status = internship.status || "Open";

  const handleApplyClick = (e: React.MouseEvent) => {
    if (onApply) {
      e.preventDefault();
      onApply(internship);
    }
  };

  return (
    <Card
      data-testid="internship-card"
      sx={{
        mb: 3,
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        boxShadow: "0 4px 20px rgba(0, 114, 255, 0.05)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        position: "relative",
        "&:hover": {
          boxShadow: "0 12px 32px rgba(0, 114, 255, 0.15)",
          transform: "translateY(-3px)",
          borderColor: "#bfdbfe",
        },
      }}
    >
      {/* Top Gradient Accent Line */}
      <Box
        sx={{
          height: 4,
          background: "linear-gradient(90deg, #0072ff 0%, #00c6ff 100%)",
        }}
      />

      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack spacing={2}>
          {/* Header Row: Title & Bookmark */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                component={Link}
                href={`/jobs/${id}`}
                sx={{
                  color: "#0f172a",
                  textDecoration: "none",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontSize: { xs: "1.1rem", sm: "1.25rem" },
                  lineHeight: 1.3,
                  "&:hover": { color: "#0072ff" },
                }}
              >
                {title}
              </Typography>
            </Box>

            <BookmarkButton itemType="job" itemId={id} />
          </Box>

          {/* Details Row: Hospital / Clinic Name & Specialty */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1.5, sm: 2 }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            {/* Hospital / Clinic Name */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  p: 0.75,
                  borderRadius: "8px",
                  bgcolor: "#eff6ff",
                  color: "#0072ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={18} />
              </Box>
              <Typography
                variant="body2"
                fontWeight={600}
                color="#334155"
                noWrap
                title={hospitalName}
              >
                {hospitalName}
              </Typography>
            </Stack>

            {/* Specialty Pill */}
            <Chip
              icon={<Stethoscope size={14} style={{ color: "#0072ff" }} />}
              label={specialty}
              size="small"
              sx={{
                bgcolor: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
                fontWeight: 600,
                fontSize: "0.78rem",
                py: 0.5,
              }}
            />
          </Stack>

          {/* Secondary Details: Duration & Location */}
          <Stack
            direction="row"
            spacing={2.5}
            alignItems="center"
            sx={{ color: "#64748b", fontSize: "0.875rem" }}
            flexWrap="wrap"
            useFlexGap
          >
            {/* Duration */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Clock size={16} style={{ color: "#64748b" }} />
              <Typography variant="caption" fontWeight={600} color="#475569">
                {duration}
              </Typography>
            </Stack>

            {/* Location */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <MapPin size={16} style={{ color: "#64748b" }} />
              <Typography variant="caption" fontWeight={600} color="#475569">
                {locationText}
              </Typography>
            </Stack>

            {/* Optional AI Match percentage chip if available */}
            {matchPercentage !== undefined && (
              <Chip
                icon={<Sparkles size={13} />}
                label={`${matchPercentage}% Match`}
                size="small"
                sx={{
                  bgcolor: matchPercentage >= 80 ? "#eff6ff" : "#fff7ed",
                  color: matchPercentage >= 80 ? "#1d4ed8" : "#c2410c",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  height: 22,
                }}
              />
            )}
          </Stack>

          <Divider sx={{ my: 0.5, borderColor: "#f1f5f9" }} />

          {/* Footer Action Row: Status & Apply Now CTA Button */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Status:{" "}
              <Box
                component="span"
                sx={{
                  color: status === "Open" ? "#16a34a" : "#64748b",
                  fontWeight: 700,
                }}
              >
                {status}
              </Box>
            </Typography>

            {/* Apply Now Button */}
            <Button
              variant="contained"
              onClick={handleApplyClick}
              disabled={isApplied || status !== "Open"}
              component={onApply || isApplied || status !== "Open" ? "button" : Link}
              href={onApply || isApplied || status !== "Open" ? undefined : `/jobs/${id}`}
              endIcon={
                isApplied ? (
                  <CheckCircle size={16} />
                ) : (
                  <ArrowRight size={16} />
                )
              }
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1,
                fontWeight: 700,
                fontSize: "0.9rem",
                textTransform: "none",
                background: isApplied
                  ? "#22c55e"
                  : "linear-gradient(90deg, #0072ff 0%, #00c6ff 100%)",
                color: "#ffffff",
                boxShadow: isApplied
                  ? "none"
                  : "0 4px 14px rgba(0, 114, 255, 0.35)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  background: isApplied
                    ? "#16a34a"
                    : "linear-gradient(90deg, #005bd6 0%, #0099ff 100%)",
                  boxShadow: isApplied
                    ? "none"
                    : "0 6px 20px rgba(0, 114, 255, 0.45)",
                  transform: "translateY(-1px)",
                },
                "&.Mui-disabled": {
                  background: isApplied ? "#22c55e" : "#e2e8f0",
                  color: isApplied ? "#ffffff" : "#94a3b8",
                },
              }}
            >
              {isApplied ? "Applied" : "Apply Now"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
