import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, Menu, MenuItem, IconButton, Stack } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import { motion } from 'framer-motion';
import api from '../../utils/api';

export default function CaseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [caseData, setCaseData] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    api.get(`/cases/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setCaseData(res.data.data.case);
        const all = res.data.data.case.comments || [];
        setPinned(all.filter((c: any) => c.pinned));
        setDiscussions(all.filter((c: any) => !c.pinned));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch case');
        setLoading(false);
      });
  }, [id]);

  const handleDiscussion = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments`, { content: comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComment('');
      // Refresh discussions
      const res = await api.get(`/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = res.data.data.case.comments || [];
      setPinned(all.filter((c: any) => c.pinned));
      setDiscussions(all.filter((c: any) => !c.pinned));
    } catch {
      setError('Failed to add discussion');
    }
  };

  const handlePin = async (commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/pin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh discussions
      const res = await api.get(`/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = res.data.data.case.comments || [];
      setPinned(all.filter((c: any) => c.pinned));
      setDiscussions(all.filter((c: any) => !c.pinned));
    } catch {
      setError('Failed to pin discussion');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!caseData) return null;

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const isAuthor = userId && caseData?.author?.id === userId;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>{caseData.title}</Typography>
        <Typography variant="body1">{caseData.description}</Typography>
        <Box sx={{ mt: 3, bgcolor: '#e3f2fd', borderRadius: 4, p: 2, boxShadow: 2, pt: 6 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 700 }}>Pinned Discussions</Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', px: 1, mb: 2 }}>
            {pinned.length === 0 && (
              <Typography variant="body2" sx={{ color: '#888', textAlign: 'center', py: 2 }}>
                No pinned discussions yet.
              </Typography>
            )}
            {pinned.map((c, idx) => {
              const isMe = c.author?.id === userId;
              const authorName = c.author?.firstName || 'Unknown';
              const initial = authorName[0]?.toUpperCase() || 'U';
              return (
                <motion.div
                  key={c._id || idx}
                  initial={{ opacity: 0, x: isMe ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Box sx={{
                    display: 'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    mb: 2,
                  }}>
                    <Box sx={{
                      background: isMe ? 'linear-gradient(135deg, #1976d2 60%, #64b5f6 100%)' : 'linear-gradient(135deg, #90caf9 60%, #e3f2fd 100%)',
                      color: '#fff',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 20,
                      boxShadow: 1,
                      mr: isMe ? 0 : 2,
                      ml: isMe ? 2 : 0,
                    }}>{initial}</Box>
                    <Box sx={{
                      bgcolor: isMe ? '#1976d2' : '#fff',
                      color: isMe ? '#fff' : '#222',
                      borderRadius: 3,
                      px: 2.5,
                      py: 2,
                      minWidth: 180,
                      maxWidth: 420,
                      boxShadow: '0 2px 12px #1976d222',
                      position: 'relative',
                    }}>
                      <Typography sx={{ wordBreak: 'break-word', fontSize: '1.15rem', fontWeight: 500 }}>{c.content}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{authorName}</Typography>
                        <Typography variant="caption" sx={{ ml: 1, color: '#90caf9' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                        {isAuthor && (
                          <IconButton size="small" sx={{ ml: 1, p: 0.5 }} onClick={() => handlePin(c._id)}>
                            <PushPinIcon sx={{ fontSize: 18, color: '#1976d2' }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </Box>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 700 }}>Discussions</Typography>
          <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1 }}>
            {discussions.length === 0 && (
              <Typography variant="body2" sx={{ color: '#888', textAlign: 'center', py: 4 }}>
                No discussions yet. Be the first to discuss!
              </Typography>
            )}
            {discussions.map((c, idx) => {
              const isMe = c.author?.id === userId;
              const authorName = c.author?.firstName || 'Unknown';
              const initial = authorName[0]?.toUpperCase() || 'U';
              return (
                <motion.div
                  key={c._id || idx}
                  initial={{ opacity: 0, x: isMe ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Box sx={{
                    display: 'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    mb: 2,
                  }}>
                    <Box sx={{
                      background: isMe ? 'linear-gradient(135deg, #1976d2 60%, #64b5f6 100%)' : 'linear-gradient(135deg, #90caf9 60%, #e3f2fd 100%)',
                      color: '#fff',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 20,
                      boxShadow: 1,
                      mr: isMe ? 0 : 2,
                      ml: isMe ? 2 : 0,
                    }}>{initial}</Box>
                    <Box sx={{
                      bgcolor: isMe ? '#1976d2' : '#fff',
                      color: isMe ? '#fff' : '#222',
                      borderRadius: 3,
                      px: 2.5,
                      py: 2,
                      minWidth: 180,
                      maxWidth: 420,
                      boxShadow: '0 2px 12px #1976d222',
                      position: 'relative',
                    }}>
                      <Typography sx={{ wordBreak: 'break-word', fontSize: '1.15rem', fontWeight: 500 }}>{c.content}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{authorName}</Typography>
                        <Typography variant="caption" sx={{ ml: 1, color: '#90caf9' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                        {isAuthor && (
                          <IconButton size="small" sx={{ ml: 1, p: 0.5 }} onClick={() => handlePin(c._id)}>
                            <PushPinIcon sx={{ fontSize: 18, color: '#1976d2' }} />
                          </IconButton>
                        )}
                        <IconButton size="small" sx={{ ml: 1, p: 0.5 }} onClick={e => { setAnchorEl(e.currentTarget); setSelectedComment(idx); }}>
                          <MoreVertIcon sx={{ fontSize: 18, color: isMe ? '#fff' : '#1976d2' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </Box>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { setAnchorEl(null); }}>Reply</MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); }}>Report</MenuItem>
          </Menu>
          {/* Modern input bar */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', bgcolor: '#fff', borderRadius: 3, boxShadow: 1, px: 2, py: 1 }}>
            <TextField
              placeholder="Type your discussion..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true, sx: { fontSize: 16 } }}
              sx={{ mr: 2 }}
              onKeyDown={e => { if (e.key === 'Enter') handleDiscussion(); }}
            />
            <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{ borderRadius: '50%', minWidth: 44, minHeight: 44, boxShadow: 2, fontSize: 18 }}
                onClick={handleDiscussion}
                disabled={!comment.trim()}
              >
                &#9658;
              </Button>
            </motion.div>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
