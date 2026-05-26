import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const mockData = ["Result 1", "Result 2", "Result 3"];

const normalizeQueryParam = (q: string | string[] | undefined) => {
  const value = Array.isArray(q) ? q[0] : q;
  return typeof value === 'string' ? value.trim() : '';
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lastSearched, setLastSearched] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  const performSearch = (q: string, syncUrl = true) => {
    const trimmed = (q || "").trim();
    const urlQuery = normalizeQueryParam(router.query.q);
    setQuery(trimmed);
    setLastSearched(trimmed);
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      if (syncUrl && urlQuery) {
        router.replace({ pathname: '/search' }, undefined, { shallow: true });
      }
      return;
    }
    const found = mockData.filter((item) => item.toLowerCase().includes(trimmed.toLowerCase()));
    setResults(found);
    setSearched(true);
    if (syncUrl && urlQuery !== trimmed) {
      router.replace({ pathname: '/search', query: { q: trimmed } }, undefined, { shallow: true });
    }
  };

  // Enter key handler on the text field
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch(query);
    }
  };

  // If query provided via URL (?q=...), perform search on mount/update
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const trimmed = normalizeQueryParam(router.query.q);

    if (trimmed === lastSearched) {
      return;
    }

    performSearch(trimmed, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.q, lastSearched]);

  const displayQuery = lastSearched.length > 50 ? `${lastSearched.substring(0, 47)}...` : lastSearched;

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      {/* Search input field */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search..."
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

      {/* Search Results */}
      {!searched ? (
        <Typography variant="body1" align="center" color="text.secondary">
          Enter a search term above and press Enter to find results.
        </Typography>
      ) : results.length > 0 ? (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {results.map((item, index) => (
            <Box key={index} flex="1 1 calc(33.33% - 16px)">
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6">{item}</Typography>
                <Typography variant="body2">This is a preview of the search result content.</Typography>
              </Paper>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body1" align="center" color="text.secondary">
          No results found for &quot;<Box component="span" sx={{ fontWeight: 600 }}>{displayQuery}</Box>&quot;.
        </Typography>
      )}
    </Container>
  );
}
