import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import api from "../../utils/api";

interface CaseItem {
  _id: string; 
  title: string;
}

export default function StarredPage() {
  const [starredCases, setStarredCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStarred = async () => {
      try {
        const res = await api.get("/cases/starred");
        const cases = res.data?.data?.cases ?? [];
        if (!cancelled) {
          setStarredCases(cases);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || "Failed to load your starred cases.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStarred();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnstar = async (caseId: string) => {
    try {
      await api.post(`/cases/${caseId}/star`);
      setStarredCases((prev) => prev.filter((item) => item._id !== caseId));
    } catch (err) {
      console.error("Failed to update star status:", err);
    }
  };

  return (
    <Box maxWidth={600} mx="auto" my={4} px={2}>
      <Card sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Starred Cases
        </Typography>

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={30} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && starredCases.length === 0 ? (
          <Typography color="text.secondary" align="center" py={4}>
            You haven&apos;t starred any cases yet.
          </Typography>
        ) : (
          <List>
            {starredCases.map((item) => (
              <ListItem
                key={item._id}
                secondaryAction={
                  <IconButton color="warning" onClick={() => handleUnstar(item._id)}>
                    <StarIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={item.title} />
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
