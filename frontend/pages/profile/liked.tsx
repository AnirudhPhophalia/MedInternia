import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Button,
  Stack,
} from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import Link from "next/link";
import api from "../../utils/api";

interface LikedCase {
  _id: string;
  title: string;
  specialization?: string;
}

export default function LikedPage() {
  const [likedCases, setLikedCases] = useState<LikedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLikedCases = async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get(`/cases/liked?page=${pageNum}&limit=10`);
      const fetchedCases = res.data?.data?.cases || [];
      const pagination = res.data?.pagination || { page: 1, pages: 1 };
      
      if (append) {
        setLikedCases((prev) => [...prev, ...fetchedCases]);
      } else {
        setLikedCases(fetchedCases);
      }
      
      setHasMore(pagination.page < pagination.pages);
      setError(null);
    } catch (err) {
      setError("Could not load liked items. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLikedCases(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLikedCases(nextPage, true);
  };

  return (
    <Box maxWidth={600} mx="auto" my={4}>
      <Card sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Liked Items
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

        {!loading && !error && likedCases.length === 0 && (
          <Typography color="text.secondary" fontSize={14}>
            You haven't liked any cases yet.
          </Typography>
        )}

        {!loading && !error && likedCases.length > 0 && (
          <>
            <List>
              {likedCases.map((item) => (
                <ListItem
                  key={item._id}
                  secondaryAction={
                    <IconButton color="primary" disabled>
                      <ThumbUpAltIcon />
                    </IconButton>
                  }
                >
                  <Link href={`/cases/${item._id}`} passHref style={{ textDecoration: "none", color: "inherit", width: "100%" }}>
                    <ListItemText primary={item.title} secondary={item.specialization} />
                  </Link>
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