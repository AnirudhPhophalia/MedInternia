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
  Button,
  Stack,
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
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadStarred = async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get(`/cases/starred?page=${pageNum}&limit=10`);
      const fetchedCases = res.data?.data?.cases || [];
      const pagination = res.data?.pagination || { page: 1, pages: 1 };
      
      if (append) {
        setStarredCases((prev) => [...prev, ...fetchedCases]);
      } else {
        setStarredCases(fetchedCases);
      }
      
      setHasMore(pagination.page < pagination.pages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load your starred cases.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadStarred(1);
  }, []);

  const handleUnstar = async (caseId: string) => {
    try {
      await api.post(`/cases/${caseId}/star`);
      setStarredCases((prev) => prev.filter((item) => item._id !== caseId));
    } catch (err) {
      console.error("Failed to update star status:", err);
    }
  };
  
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadStarred(nextPage, true);
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
          !loading && !error && (
            <>
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
              
              {hasMore && (
                <Stack direction="row" justifyContent="center" mt={3}>
                  <Button 
                    variant="outlined" 
                    onClick={loadMore} 
                    disabled={loadingMore}
                  >
                    {loadingMore ? <CircularProgress size={20} /> : "Load More"}
                  </Button>
                </Stack>
              )}
            </>
          )
        )}
      </Card>
    </Box>
  );
}
