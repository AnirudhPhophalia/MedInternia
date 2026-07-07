import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Chip,
  CircularProgress,
  Stack,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { smartSearch } from "../../utils/api";

interface JobResult {
  _id: string;
  title: string;
  company: string;
  type: string;
  specialization?: string[];
  location: { city: string; state: string; country: string; isRemote: boolean };
}

interface ProfileResult {
  _id: string;
  firstName: string;
  lastName: string;
  userType: string;
  specialization?: string;
  bio?: string;
  profilePicture?: string;
}

const normalizeQueryParam = (q: string | string[] | undefined) => {
  const value = Array.isArray(q) ? q[0] : q;
  return typeof value === "string" ? value.trim() : "";
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lastSearched, setLastSearched] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [parsedFilters, setParsedFilters] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(
    async (q: string, syncUrl = true) => {
      const trimmed = (q || "").trim();
      const urlQuery = normalizeQueryParam(router.query.q);
      setQuery(trimmed);
      setLastSearched(trimmed);

      if (!trimmed) {
        setJobs([]);
        setProfiles([]);
        setParsedFilters(null);
        setSearched(false);
        setError("");
        if (syncUrl && urlQuery) {
          router.replace({ pathname: "/search" }, undefined, { shallow: true });
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await smartSearch(trimmed);
        setJobs(data?.data?.jobOpportunities ?? []);
        setProfiles(data?.data?.profiles ?? []);
        setParsedFilters(data?.data?.parsedFilters ?? null);
        setSearched(true);
      } catch (err) {
        console.error("Smart search failed:", err);
        setError("Something went wrong while searching. Please try again.");
        setJobs([]);
        setProfiles([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }

      if (syncUrl && urlQuery !== trimmed) {
        router.replace({ pathname: "/search", query: { q: trimmed } }, undefined, { shallow: true });
      }
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch(query);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    const trimmed = normalizeQueryParam(router.query.q);
    if (trimmed === lastSearched) return;
    performSearch(trimmed, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.q]);

  const displayQuery = lastSearched.length > 50 ? `${lastSearched.substring(0, 47)}...` : lastSearched;
  const hasResults = jobs.length > 0 || profiles.length > 0;

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 8 }}>
      {/* Search input field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Try “remote cardiology internships in Texas”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Parsed filter chips, for transparency into what the AI understood */}
      {parsedFilters && searched && !loading && (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {(parsedFilters.specialization as string[] | undefined)?.map((s) => (
            <Chip key={s} label={s} size="small" />
          ))}
          {parsedFilters.type ? <Chip label={String(parsedFilters.type)} size="small" /> : null}
          {parsedFilters.location ? <Chip label={`📍 ${parsedFilters.location}`} size="small" /> : null}
          {parsedFilters.isRemote ? <Chip label="Remote" size="small" color="primary" /> : null}
        </Stack>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Typography variant="body1" align="center" color="error">
          {error}
        </Typography>
      )}

      {!loading && !error && !searched && (
        <Typography variant="body1" align="center" color="text.secondary">
          Enter a search term above and press Enter to find results.
        </Typography>
      )}

      {!loading && !error && searched && !hasResults && (
        <Typography variant="body1" align="center" color="text.secondary">
          No results found for &quot;
          <Box component="span" sx={{ fontWeight: 600 }}>
            {displayQuery}
          </Box>
          &quot;.
        </Typography>
      )}

      {!loading && !error && jobs.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Job & Internship Listings
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {jobs.map((job) => (
              <Box key={job._id} flex="1 1 calc(50% - 16px)" minWidth={260}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6">{job.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {job.company} · {job.location?.isRemote ? "Remote" : job.location?.city}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip label={job.type} size="small" />
                    {job.specialization?.slice(0, 2).map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {!loading && !error && profiles.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Profiles
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {profiles.map((p) => (
              <Box key={p._id} flex="1 1 calc(33.33% - 16px)" minWidth={200}>
                <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar src={p.profilePicture}>{p.firstName?.[0]}</Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {p.firstName} {p.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.specialization || p.userType}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}
