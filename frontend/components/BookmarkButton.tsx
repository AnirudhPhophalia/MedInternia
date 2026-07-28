import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import api from '../utils/api';

interface BookmarkButtonProps {
  itemType: 'case' | 'job' | 'webinar';
  itemId: string;
}

import { useAuth } from '../context/AuthContext';

export default function BookmarkButton({ itemType, itemId }: BookmarkButtonProps) {
  const { userId, user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial status from user profile
    const checkStatus = async () => {
      if (!userId && !user) return;
      
      try {
        const userData = user || (await api.get('/auth/me')).data?.user;
        if (!userData) return;
        
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
  }, [itemType, itemId, userId, user]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking the card underneath
    e.preventDefault();
    
    const uid = userId || user?._id || user?.id;
    if (!uid) return;

    setLoading(true);
    try {
      const res = await api.post(`/users/${uid}/save/${itemType}/${itemId}`);
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
