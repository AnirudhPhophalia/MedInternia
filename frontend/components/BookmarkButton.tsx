import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import api from '../utils/api';

interface BookmarkButtonProps {
  itemType: 'case' | 'job' | 'webinar';
  itemId: string;
}

export default function BookmarkButton({ itemType, itemId }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial status from user profile
    const checkStatus = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      try {
        const res = await api.get(`/users/${userId}/profile`);
        const userData = res.data?.data?.user || res.data?.user || res.data;
        
        let arrayToCheck: string[] = [];
        if (itemType === 'case') arrayToCheck = userData.savedCases || [];
        if (itemType === 'job') arrayToCheck = userData.savedJobs || [];
        if (itemType === 'webinar') arrayToCheck = userData.savedWebinars || [];
        
        setIsBookmarked(arrayToCheck.includes(itemId));
      } catch (err) {
        console.error('Failed to fetch bookmark status', err);
      }
    };
    checkStatus();
  }, [itemType, itemId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking the card underneath
    e.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    setLoading(true);
    try {
      const res = await api.post(`/users/${userId}/save/${itemType}/${itemId}`);
      if (res.data?.success) {
        setIsBookmarked(res.data.data.isBookmarked);
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={isBookmarked ? "Remove from saved items" : "Save for later"} placement="top">
      <IconButton 
        onClick={handleToggle} 
        disabled={loading}
        sx={{ 
          color: isBookmarked ? 'primary.main' : 'text.secondary',
          '&:hover': { bgcolor: 'rgba(0,114,255,0.08)' },
          zIndex: 10
        }}
      >
        {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
      </IconButton>
    </Tooltip>
  );
}
