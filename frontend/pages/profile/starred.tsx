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

interface CaseItem {
  _id: string; 
  title: string;
}

export default function StarredPage() {
  const [starredCases, setStarredCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's real starred cases on page load
  useEffect(() => {
    fetch("/api/cases/starred") 
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load your starred cases.");
        return res.json();
      })
      .then((data) => {
        setStarredCases(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Communicate the toggle back to the server and update local UI
  const handleUnstar = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/star`, { method: "POST" });
      if (res.ok) {
        // Optimistically slice it out of the UI list immediately
        setStarredCases((prev) => prev.filter((item) => item._id !== caseId));
      }
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
            You haven't starred any cases yet.
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