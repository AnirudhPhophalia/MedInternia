import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, IconButton, Stack, Collapse, Tooltip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, Card, Divider, Chip } from '@mui/material';
import { MessageCircleReply, Pin } from 'lucide-react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import Link from 'next/link';
import PdfExportButton from '../../components/PdfExportButton';
import ClinicalTimeline from '../../components/ClinicalTimeline';

export default function CaseDiscussion({ id: propId, modalMode, hideDescription }: { id?: string, modalMode?: boolean, hideDescription?: boolean }) {
  const router = useRouter();
  const id = propId || router.query.id;
  const [caseData, setCaseData] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [openReplies, setOpenReplies] = useState<{[key: string]: boolean}>({});

  // P2P Consultation States
  const [activeConsult, setActiveConsult] = useState<any>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultSpecialty, setConsultSpecialty] = useState('General');
  const [consultPoints, setConsultPoints] = useState(10);
  const [chatMessage, setChatMessage] = useState('');

  const fetchConsultations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/consultations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data?.data?.requests || [];
      const match = list.find((r: any) => r.case?._id === id && r.status !== 'resolved');
      setActiveConsult(match || null);
    } catch (err) {
      console.error('Failed to fetch consultations', err);
    }
  };

  const handleRequestConsult = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/consultations', {
        caseId: id,
        specialty: consultSpecialty,
        rewardPoints: consultPoints
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsultOpen(false);
      fetchConsultations();
      alert('Consultation request submitted successfully!');
    } catch (err) {
      console.error('Failed to submit consultation request', err);
      alert('Failed to submit consultation request. Check your points balance.');
    }
  };

  const handleAcceptConsult = async () => {
    if (!activeConsult) return;
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/consultations/${activeConsult._id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConsultations();
      alert('You have accepted this consultation request!');
    } catch (err) {
      console.error('Failed to accept consultation', err);
    }
  };

  const handleResolveConsult = async () => {
    if (!activeConsult) return;
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/consultations/${activeConsult._id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConsultations();
      alert('Consultation resolved successfully!');
    } catch (err) {
      console.error('Failed to resolve consultation', err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !activeConsult) return;
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/consultations/${activeConsult._id}/messages`, {
        content: chatMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveConsult(res.data?.data?.request);
      setChatMessage('');
    } catch (err) {
      console.error('Failed to send consultation message', err);
    }
  };
  // Like and rate logic
  const handleLike = async (commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh discussions
      const res = await api.get(`/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  const all = res.data.data.case.comments || [];
  setPinned(all.filter((c: any) => c.pinned));
  setDiscussions(all); // Show all comments in discussions, including pinned
    } catch {
      setError('Failed to like discussion');
    }
  };

  const handleRate = async (commentId: string, rating: number) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/rate`, { rating }, {
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
      setError('Failed to rate discussion');
    }
  };
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
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
    
    fetchConsultations();
  }, [id]);

  const handleDiscussion = async () => {
    try {
      const token = localStorage.getItem('token');
      // If replying, post as a reply to the selected comment
      if (replyTo) {
        await api.post(`/cases/${id}/comments/${replyTo._id}/reply`, { content: replyContent }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post(`/cases/${id}/comments`, { content: comment }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setComment('');
      setReplyTo(null);
      setReplyContent('');
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

  function handleReply(comment: any) {
    setReplyTo(comment);
    setReplyContent('');
  }

  async function submitReply() {
    if (!replyContent.trim()) return;
    await handleDiscussion();
  }

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

  const handleUnpin = async (commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/unpin`, {}, {
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
      setError('Failed to unpin discussion');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!caseData) return null;

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const isAuthor = userId && caseData?.author?.id === userId;

  // Merge pinned and regular discussions for PDF export
  const allDiscussions = [...pinned, ...discussions];

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        {!hideDescription && <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ flex: 1 }}>{caseData.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {!activeConsult ? (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small" 
                  onClick={() => setConsultOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Request P2P Consultation
                </Button>
              ) : (
                <Chip 
                  label={`Consulting: ${activeConsult.status.toUpperCase()}`}
                  color={activeConsult.status === 'in_progress' ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
              <PdfExportButton caseData={caseData} discussions={allDiscussions} />
            </Stack>
          </Box>
          <Typography variant="body1">{caseData.description}</Typography>
        </>}

        <Tabs 
          value={activeTab} 
          onChange={(e, val) => setActiveTab(val)} 
          centered 
          sx={{ my: 3, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab label="Clinical Timeline" sx={{ fontWeight: 600 }} />
          <Tab label={`Discussions (${allDiscussions.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>

        {activeTab === 0 && (
          <ClinicalTimeline caseData={caseData} discussions={allDiscussions} />
        )}

        {activeTab === 1 && (
          <>
          {pinned.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#fffbe6', borderRadius: 3, boxShadow: '0 2px 12px #ffd70022', border: '1.5px solid #ffe066' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#FFD700', fontWeight: 700 }}>Keypoints</Typography>
              {pinned
                .filter((c) => !c.replyTo)
                .map((c, idx) => {
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
                      <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', mb: 2 }}>
                        <Box sx={{ background: isMe ? 'linear-gradient(135deg, #FFD700 60%, #ffe066 100%)' : 'linear-gradient(135deg, #ffe066 60%, #fffbe6 100%)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, boxShadow: 1, mr: isMe ? 0 : 2, ml: isMe ? 2 : 0 }}>{initial}</Box>
                        <Box sx={{ bgcolor: '#fffbe6', color: '#222', borderRadius: 3, px: 2.5, py: 2, minWidth: 180, maxWidth: 420, boxShadow: '0 2px 12px #ffd70022', position: 'relative', border: '1.5px solid #ffe066' }}>
                          <Typography sx={{ wordBreak: 'break-word', fontSize: '1.15rem', fontWeight: 500 }}>{c.content}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{authorName}</Typography>
                            <Typography variant="caption" sx={{ ml: 1, color: '#FFD700' }}>{c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Typography>
                            {/* Reply icon (lucide, always visible) */}
                            <IconButton size="small" sx={{ ml: 1, p: 0.5, color: '#FFD700', '&:hover': { bgcolor: '#ffe066' }, borderRadius: 2 }} onClick={() => handleReply(c)}>
                              <MessageCircleReply size={20} strokeWidth={2.2} />
                            </IconButton>
                            {/* Unpin icon/button for pinned comments */}
                            <Tooltip title="Unpin">
                              <IconButton
                                size="small"
                                sx={{ ml: 1, p: 0.5, color: '#FFD700', borderRadius: 2, '&:hover': { bgcolor: '#ffe066', color: '#222' }, boxShadow: '0 2px 8px #ffd70088' }}
                                onClick={() => handleUnpin(c._id)}
                              >
                                <PushPinIcon sx={{ fontSize: 22 }} />
                              </IconButton>
                            </Tooltip>
                            {/* Like button with active state */}
                            <IconButton size="small" sx={{ ml: 1, p: 0.5 }} onClick={() => handleLike(c._id)}>
                              <ThumbUpAltOutlinedIcon sx={{ fontSize: 18, color: c.likedBy?.includes(userId) ? '#FFD700' : '#2193b0' }} />
                            </IconButton>
                          </Box> {/* end inner Box (actions) */}
                        </Box>
                      </Box> {/* end Box (content + avatar) */}
                    </motion.div>
                  );
                })}
            </Box>
          )}
          <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1 }}>
            {discussions.length === 0 && (
              <Typography variant="body2" sx={{ color: '#888', textAlign: 'center', py: 4 }}>
                No discussions yet. Be the first to discuss!
              </Typography>
            )}
            {discussions
              .filter((c) => !c.replyTo) // Only top-level comments
              .map((c, idx) => {
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
                          {/* Reply icon (lucide, always visible) */}
                          <IconButton size="small" sx={{ ml: 1, p: 0.5, color: '#1976d2', '&:hover': { bgcolor: '#e3f2fd' }, borderRadius: 2 }} onClick={() => handleReply(c)}>
                            <MessageCircleReply size={20} strokeWidth={2.2} />
                          </IconButton>
                          {/* Pin button visible to all users */}
                          <Tooltip title={c.pinned ? 'Unpin' : 'Pin'}>
                            <IconButton
                              size="small"
                              sx={{ ml: 1, p: 0.5, color: c.pinned ? '#FFD700' : '#2193b0', borderRadius: 2, '&:hover': { bgcolor: '#e3f2fd', color: '#1976d2' }, boxShadow: c.pinned ? '0 2px 8px #ffd70088' : 'none' }}
                              onClick={() => handlePin(c._id)}
                            >
                              <PushPinIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                          </Tooltip>
                          {/* Like button with active state */}
                          <IconButton size="small" sx={{ ml: 1, p: 0.5 }} onClick={() => handleLike(c._id)}>
                            <ThumbUpAltOutlinedIcon sx={{ fontSize: 18, color: c.likedBy?.includes(userId) ? '#1976d2' : '#2193b0' }} />
                          </IconButton>
                          {/* Dropdown for replies */}
                          {c.replies && c.replies.length > 0 && (
                            <Button size="small" sx={{ ml: 1, fontSize: 12, color: '#1976d2', textTransform: 'none' }} onClick={() => setOpenReplies(prev => ({ ...prev, [c._id]: !prev[c._id] }))}>
                              {openReplies[c._id] ? 'Hide Replies' : `Show Replies (${c.replies.length})`}
                            </Button>
                          )}
                        </Box>
                        {/* Collapsible replies with WhatsApp-style reply preview */}
                        {c.replies && c.replies.length > 0 && (
                          <Collapse in={!!openReplies[c._id]}>
                            <Box sx={{ mt: 1, ml: 4, pl: 2, borderLeft: '2px solid #90caf9', bgcolor: '#f5fafd', borderRadius: 2 }}>
                              {discussions
                                .filter((r: any) => r.replyTo === c._id)
                                .map((r: any, ridx: number) => {
                                  // Find parent comment content by _id in pinned or discussions
                                  const parentContent = (() => {
                                    if (!r.replyTo) return '';
                                    const allComments = [...pinned, ...discussions];
                                    const parent = allComments.find((cm: any) => cm._id === r.replyTo);
                                    return parent?.content || '';
                                  })();
                                  return (
                                    <Box key={r._id || ridx} sx={{ mb: 2, display: 'flex', alignItems: 'flex-end' }}>
                                      <Box sx={{
                                        background: 'linear-gradient(135deg, #1976d2 60%, #64b5f6 100%)',
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 16,
                                        mr: 1.5,
                                        boxShadow: '0 2px 8px #1976d222',
                                      }}>{r.author?.firstName?.[0]?.toUpperCase() || 'U'}</Box>
                                      <Box sx={{
                                        bgcolor: '#e3f2fd',
                                        color: '#1976d2',
                                        borderRadius: 3,
                                        px: 2.5,
                                        py: 1.5,
                                        boxShadow: '0 2px 12px #1976d222',
                                        border: '1.5px solid #90caf9',
                                        minWidth: 120,
                                        maxWidth: 340,
                                        ml: 0.5
                                      }}>
                                        <Typography sx={{ fontSize: '1.05rem', fontWeight: 500, mb: 0.5 }}>{r.content}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.85rem', color: '#1976d2' }}>
                                          {r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })}
                            </Box>
                          </Collapse>
                        )}
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
          </Box>
          {/* Removed MoreVert menu for main actions */}
          {/* Reply input bar */}
          {replyTo && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', bgcolor: '#e3f2fd', borderRadius: 3, boxShadow: 1, px: 2, py: 1 }}>
              <TextField
                placeholder={`Replying to ${replyTo.author?.firstName || 'user'}...`}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                variant="standard"
                fullWidth
                InputProps={{ disableUnderline: true, sx: { fontSize: 16 } }}
                sx={{ mr: 2 }}
                onKeyDown={e => { if (e.key === 'Enter') submitReply(); }}
              />
              <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ borderRadius: '50%', minWidth: 44, minHeight: 44, boxShadow: 2, fontSize: 18 }}
                  onClick={submitReply}
                  disabled={!replyContent.trim()}
                >
                  &#9658;
                </Button>
              </motion.div>
              <Button onClick={() => setReplyTo(null)} sx={{ ml: 2, color: '#1976d2', fontWeight: 700 }}>Cancel</Button>
            </Box>
          )}
          {/* Modern input bar */}
          {!replyTo && (
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
          )}
          </>
        )}

        {/* P2P Consultation chat workspace */}
        {activeConsult && (
          <Card sx={{ mt: 4, p: 3, borderRadius: 4, border: '1.5px solid #6b21a8', bgcolor: '#faf5ff', boxShadow: '0 4px 20px rgba(107,33,168,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={800} color="secondary.main">
                🤝 Private P2P Consultation Workspace
              </Typography>
              <Chip 
                label={`Status: ${activeConsult.status.toUpperCase()}`}
                color={activeConsult.status === 'in_progress' ? 'success' : 'warning'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Requested Specialty Focus: <strong>{activeConsult.specialty}</strong> | Pledged Points: <strong>{activeConsult.rewardPoints}</strong>
            </Typography>

            {activeConsult.assignedConsultant ? (
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                Assigned Specialist: Dr. {activeConsult.assignedConsultant.firstName} {activeConsult.assignedConsultant.lastName}
              </Typography>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1.5 }}>
                  Waiting for a specialist to accept this request...
                </Typography>
                {(typeof window !== 'undefined' && localStorage.getItem('userType') === 'doctor') && (
                  <Button variant="contained" color="secondary" size="small" onClick={handleAcceptConsult} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Accept Consultation
                  </Button>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Chat Room Messages */}
            <Stack spacing={1.5} sx={{ maxHeight: 250, overflowY: 'auto', mb: 2, pr: 1 }}>
              {activeConsult.messages?.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', display: 'block', my: 2 }}>
                  Secure workspace opened. Start typing your consultation notes/questions below.
                </Typography>
              ) : (
                activeConsult.messages.map((msg: any, midx: number) => {
                  const isMe = msg.sender?._id?.toString() === userId || msg.sender?.toString() === userId;
                  return (
                    <Box key={midx} sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                      <Box 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 3, 
                          bgcolor: isMe ? '#9333ea' : '#fff', 
                          color: isMe ? '#fff' : '#222',
                          boxShadow: 1,
                          maxWidth: '75%',
                          border: isMe ? 'none' : '1px solid #e2e8f0'
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.85, display: 'block', mb: 0.5 }}>
                          {msg.sender?.firstName || 'User'} ({msg.sender?.userType?.toUpperCase()})
                        </Typography>
                        <Typography variant="body2">{msg.content}</Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Stack>

            {/* Send chat message input */}
            {(activeConsult.status === 'in_progress' || activeConsult.assignedConsultant) && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Type a clinical question or guidance..."
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  fullWidth
                  onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                />
                <Button variant="contained" color="secondary" onClick={handleSendChatMessage} disabled={!chatMessage.trim()}>
                  Send
                </Button>
              </Stack>
            )}

            {/* Resolve consulting request */}
            {activeConsult.status === 'in_progress' && (
              <Button variant="outlined" color="success" size="small" fullWidth onClick={handleResolveConsult} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Mark Consultation Resolved (Releases Points)
              </Button>
            )}
          </Card>
        )}
      </Box>

      {/* Request P2P Consultation Dialog */}
      <Dialog 
        open={consultOpen} 
        onClose={() => setConsultOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Request Peer Consultation</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Required Specialty</InputLabel>
              <Select
                value={consultSpecialty}
                label="Required Specialty"
                onChange={e => setConsultSpecialty(e.target.value)}
              >
                <MenuItem value="General">General Practice</MenuItem>
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Pediatrics">Pediatrics</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Internal Medicine">Internal Medicine</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Pledged Reward Points"
              type="number"
              value={consultPoints}
              onChange={e => setConsultPoints(Math.max(0, Number(e.target.value)))}
              fullWidth
              helperText="These points will be locked and transferred to the consultant doctor upon resolution."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConsultOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleRequestConsult} 
            variant="contained" 
            color="secondary"
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
