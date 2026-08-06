import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import api from "../../utils/api";

type SearchResult = {
  id: string;
  type: "case" | "internship" | "paper" | "webinar" | "clinician";
  title: string;
  subtitle?: string;
  href: string;
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  case: "Case",
  internship: "Internship / Job",
  paper: "Research Paper",
  webinar: "Webinar",
  clinician: "Clinician",
};

const normalizeQueryParam = (q: string | string[] | undefined) => {
  const value = Array.isArray(q) ? q[0] : q;
  return typeof value === "string" ? value.trim() : "";
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lastSearched, setLastSearched] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const performSearch = async (q: string, syncUrl = true) => {
    const trimmed = (q || "").trim();
    const urlQuery = normalizeQueryParam(router.query.q);
    setQuery(trimmed);
    setLastSearched(trimmed);
    setError("");

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      if (syncUrl && urlQuery) {
        router.replace({ pathname: "/search" }, undefined, { shallow: true });
      }
      return;
    }

    setLoading(true);
    setSearched(true);
    if (syncUrl && urlQuery !== trimmed) {
      router.replace(
        { pathname: "/search", query: { q: trimmed } },
        undefined,
        { shallow: true },
      );
    }

    try {
      const res = await api.get("/search/global", {
        params: { q: trimmed },
      });
      const found = res.data?.data?.results || [];
      setResults(Array.isArray(found) ? found : []);
    } catch (err: any) {
      setResults([]);
      setError(
        err?.response?.data?.message ||
          "Search failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void performSearch(query);
    }
  };

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const trimmed = normalizeQueryParam(router.query.q);

    if (trimmed === lastSearched) {
      return;
    }

    void performSearch(trimmed, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.q, lastSearched]);

  const displayQuery =
    lastSearched.length > 50
      ? `${lastSearched.substring(0, 47)}...`
      : lastSearched;

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search cases, internships, papers, webinars, clinicians..."
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

      {loading && (
        <Box display="flex" justifyContent="center" py={4} role="status">
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && !searched && (
        <Typography variant="body1" align="center" color="text.secondary">
          Enter a search term above and press Enter to find results.
        </Typography>
      )}

      {!loading && !error && searched && results.length > 0 && (
        <Box display="flex" flexDirection="column" gap={2}>
          {results.map((item) => (
            <Paper
              key={`${item.type}-${item.id}`}
              component={Link}
              href={item.href}
              sx={{
                p: 2,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Chip
                  size="small"
                  label={TYPE_LABELS[item.type] || item.type}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Typography variant="h6">{item.title}</Typography>
              {item.subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {item.subtitle}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <Typography variant="body1" align="center" color="text.secondary">
          No results found for &quot;
          <Box component="span" sx={{ fontWeight: 600 }}>
            {displayQuery}
          </Box>
          &quot;.
        </Typography>
      )}
    </Container>
  );
}
