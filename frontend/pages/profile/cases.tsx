import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useRouter } from 'next/router';
import api from "../../utils/api";

interface CaseItem {
  _id: string;
  title: string;
  moderationStatus?: string;
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCases = async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get(`/cases/my/cases?page=${pageNum}&limit=10`);
      const fetchedCases = res.data?.data?.cases || [];
      const pagination = res.data?.pagination || { page: 1, pages: 1 };
      
      if (append) {
        setCases((prev) => [...prev, ...fetchedCases]);
      } else {
        setCases(fetchedCases);
      }
      
      setHasMore(pagination.page < pagination.pages);
      setError(null);
    } catch (err) {
      setError("Failed to load your cases. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCases(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCases(nextPage, true);
  };

  return (
    <Box maxWidth={600} mx="auto" my={4}>
      <Card sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          My Cases
        </Typography>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && (
          <Typography color="error" fontSize={14}>
            {error}
          </Typography>
        )}

        {!loading && !error && cases.length === 0 && (
          <Typography color="text.secondary" fontSize={14}>
            You haven't posted any cases yet.
          </Typography>
        )}

        {!loading && !error && cases.length > 0 && (
          <>
            <List>
              {cases.map((c) => (
                <ListItem
                  key={c._id}
                  secondaryAction={
                    <Button variant="outlined" onClick={() => router.push(`/cases/${c._id}`)}>
                      View
                    </Button>
                  }
                >
                  <ListItemText primary={c.title} secondary={c.moderationStatus || "Approved"} />
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
        )}
      </Card>
    </Box>
  );
}
