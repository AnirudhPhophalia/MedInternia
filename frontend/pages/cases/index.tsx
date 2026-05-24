import { useEffect, useState, useCallback, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Collapse,
  Modal,
  IconButton,
  InputAdornment,
  TextField,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import SortIcon from "@mui/icons-material/Sort";
import CaseCard from "../../components/CaseCard";
import api from "../../utils/api";
import Link from "next/link";
import { canUser } from "../../utils/permissions";

import dynamic from "next/dynamic";
const CaseDiscussion = dynamic(() => import("./[id]"), { ssr: false });

const SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Oncology",
  "Radiology",
  "General Medicine",
  "Psychiatry",
  "Surgery",
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const STATUSES = ["Open", "Solved", "Pending"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_rated", label: "Most Rated" },
  { value: "most_discussed", label: "Most Discussed" },
];

export default function Cases() {
  const [cases, setCases] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openDiscussionId, setOpenDiscussionId] = useState<string | null>(null);
  const [canCreateCases, setCanCreateCases] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [totalCount, setTotalCount] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCases = useCallback(
    async (params: {
      search: string;
      specialty: string;
      difficulty: string;
      status: string;
      sort: string;
    }) => {
      setLoading(true);
      setError("");
      try {
        const query: Record<string, string> = { sort: params.sort };
        if (params.search) query.search = params.search;
        if (params.specialty) query.specialization = params.specialty;
        if (params.difficulty) query.difficulty = params.difficulty;
        if (params.status) query.status = params.status;

        const res = await api.get("/cases", { params: query });
        setCases(res.data.data.cases || []);
        setTotalCount(res.data.data.totalCount ?? res.data.data.pagination?.total ?? 0);
      } catch {
        setError("Failed to fetch cases");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    api
      .get("/auth/profile")
      .then((res) => {
        const userType = res.data?.data?.user?.userType;
        setCanCreateCases(canUser(userType, "case:create"));
      })
      .catch(() => setCanCreateCases(false));
  }, []);

  useEffect(() => {
    fetchCases({ search, specialty, difficulty, status, sort });
  }, [search, specialty, difficulty, status, sort, fetchCases]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setSearch("");
    setSpecialty("");
    setDifficulty("");
    setStatus("");
    setSort("newest");
  };

  const hasActiveFilters = searchInput || specialty || difficulty || status || sort !== "newest";

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="h3"
          fontWeight={900}
          color="#1565c0"
          gutterBottom
          sx={{ letterSpacing: 1 }}
        >
          Medical Cases
        </Typography>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          mb={2}
          sx={{ fontSize: "1.15rem", fontWeight: 500 }}
        >
          Discover, review, and contribute to real-world medical cases. Dive
          into interactive case studies and expand your clinical knowledge.
        </Typography>
        {canCreateCases && (
          <Button
            variant="contained"
            color="primary"
            sx={{
              mb: 2,
              borderRadius: 3,
              fontWeight: 700,
              px: 4,
              py: 1.2,
              fontSize: "1.08rem",
              boxShadow: "0 2px 8px #2193b044",
              transition: "all 0.2s",
              "&:hover": {
                background: "#1565c0",
                boxShadow: "0 4px 16px #2193b066",
              },
            }}
            component={Link}
            href="/cases/create"
          >
            + Create New Case
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by title, description, or tag..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          id="cases-search-input"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#2193b0" }} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearchChange("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: { borderRadius: 3, bgcolor: "#f5fafd" },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
        />
      </Box>

      {/* Filters + Sort Row */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <TuneIcon sx={{ color: "#2193b0", fontSize: 18 }} />
          <Typography fontSize={14} fontWeight={600} color="#555">
            Filters:
          </Typography>
        </Box>

        {/* Specialty chips */}
        {SPECIALTIES.slice(0, 6).map((s) => (
          <Chip
            key={s}
            label={s}
            clickable
            color={specialty === s ? "primary" : "default"}
            variant={specialty === s ? "filled" : "outlined"}
            onClick={() => setSpecialty(specialty === s ? "" : s)}
            size="small"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          />
        ))}

        {/* Difficulty chips */}
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d}
            label={d.charAt(0).toUpperCase() + d.slice(1)}
            clickable
            color={difficulty === d ? "secondary" : "default"}
            variant={difficulty === d ? "filled" : "outlined"}
            onClick={() => setDifficulty(difficulty === d ? "" : d)}
            size="small"
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: "capitalize" }}
          />
        ))}

        {/* Status chips */}
        {STATUSES.map((st) => (
          <Chip
            key={st}
            label={st}
            clickable
            color={
              status === st
                ? st === "Open"
                  ? "info"
                  : st === "Solved"
                  ? "success"
                  : "warning"
                : "default"
            }
            variant={status === st ? "filled" : "outlined"}
            onClick={() => setStatus(status === st ? "" : st)}
            size="small"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          />
        ))}

        {/* Sort */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
          <SortIcon sx={{ color: "#2193b0", fontSize: 18 }} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="sort-label">Sort</InputLabel>
            <Select
              labelId="sort-label"
              id="cases-sort-select"
              value={sort}
              label="Sort"
              onChange={(e) => setSort(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {hasActiveFilters && (
          <Button
            size="small"
            variant="text"
            onClick={clearAllFilters}
            sx={{ color: "#e53935", fontWeight: 600, ml: 1, borderRadius: 2 }}
          >
            Clear all
          </Button>
        )}
      </Box>

      {/* Results count */}
      {!loading && !error && (
        <Typography fontSize={13} color="#888" sx={{ mb: 1.5 }}>
          {totalCount} case{totalCount !== 1 ? "s" : ""} found
          {search ? ` for "${search}"` : ""}
        </Typography>
      )}

      {/* Case list */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : cases.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            px: 4,
            borderRadius: 4,
            bgcolor: "#f5fafd",
            border: "1.5px dashed #b3d4f5",
          }}
        >
          <Typography fontSize={48} mb={1}>
            🔍
          </Typography>
          <Typography variant="h6" fontWeight={700} color="#1565c0" mb={1}>
            No cases found
          </Typography>
          <Typography color="text.secondary" mb={3}>
            {search || specialty || difficulty || status
              ? "Try adjusting your search terms or clearing filters to see more results."
              : "No cases have been posted yet. Be the first to contribute!"}
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              onClick={clearAllFilters}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            animation: "fadeIn 0.6s",
          }}
        >
          {cases.map((c, i) => (
            <Card
              key={c._id}
              sx={{
                borderRadius: 4,
                boxShadow: "0 2px 16px #2193b022",
                p: 0,
                overflow: "visible",
                animation: `slideUp 0.5s ${i * 0.07}s both`,
              }}
            >
              <CardContent sx={{ pb: 2 }}>
                <CaseCard
                  caseData={c}
                  onOpenDiscussion={() => setOpenDiscussionId(c._id)}
                  onReadMore={() => setExpanded(expanded === c._id ? null : c._id)}
                  isExpanded={expanded === c._id}
                />
                <Collapse in={expanded === c._id} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      mt: 2,
                      mb: 1,
                      p: 2,
                      borderRadius: 3,
                      bgcolor: "#f5fafd",
                      boxShadow: "0 2px 12px #2193b022",
                      border: "1px solid #e3eafc",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="#1976d2"
                      sx={{ mb: 1 }}
                    >
                      Full Description
                    </Typography>
                    <Typography
                      color="#333"
                      fontSize={15}
                      sx={{ whiteSpace: "pre-line" }}
                    >
                      {c.description || "No description."}
                    </Typography>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Discussion Modal */}
      <Modal
        open={!!openDiscussionId}
        onClose={() => setOpenDiscussionId(null)}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            width: { xs: "98vw", sm: 600 },
            maxHeight: "90vh",
            overflowY: "auto",
            bgcolor: "#f8fafd",
            borderRadius: 4,
            boxShadow: 24,
            p: 2,
            position: "relative",
          }}
        >
          <IconButton
            onClick={() => setOpenDiscussionId(null)}
            sx={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {openDiscussionId && (
            <CaseDiscussion id={openDiscussionId} modalMode hideDescription />
          )}
        </Box>
      </Modal>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Container>
  );
}
