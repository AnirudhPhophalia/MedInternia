import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, IconButton, Stack, Collapse, Tooltip, Tabs, Tab, Card, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip, Slider, LinearProgress } from '@mui/material';
import { MessageCircleReply, Pin } from 'lucide-react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { motion } from 'framer-motion';
import api from '../../utils/api';
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

  // Differential Diagnosis States
  const [diffTitle, setDiffTitle] = useState('');
  const [diffConfidence, setDiffConfidence] = useState(50);
  const [diffSupporting, setDiffSupporting] = useState('');
  const [diffExcluding, setDiffExcluding] = useState('');
  const [diffNotes, setDiffNotes] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [diffComments, setDiffComments] = useState<{[diffId: string]: string}>({});

  const handleSuggestDiff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/cases/${id}/differentials`, {
        title: diffTitle,
        confidence: diffConfidence,
        supportingEvidence: diffSupporting.split(',').map(s => s.trim()).filter(Boolean),
        excludingEvidence: diffExcluding.split(',').map(s => s.trim()).filter(Boolean),
        notes: diffNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData({ ...caseData, differentials: res.data.data.differentials });
      setDiffTitle('');
      setDiffConfidence(50);
      setDiffSupporting('');
      setDiffExcluding('');
      setDiffNotes('');
      setSuggestOpen(false);
    } catch {
      setError('Failed to suggest differential diagnosis');
    }
  };

  const handleUpdateDiffStatus = async (diffId: string, status: 'active' | 'ruled_out' | 'confirmed') => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.patch(`/cases/${id}/differentials/${diffId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData({ ...caseData, differentials: res.data.data.differentials });
    } catch {
      setError('Failed to update differential status');
    }
  };

  const handleAddDiffComment = async (diffId: string) => {
    const text = diffComments[diffId];
    if (!text || !text.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/cases/${id}/differentials/${diffId}/comments`, { content: text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData({ ...caseData, differentials: res.data.data.differentials });
      setDiffComments(prev => ({ ...prev, [diffId]: '' }));
    } catch {
      setError('Failed to add comment to differential');
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
  const doctorId = caseData?.doctor?._id || caseData?.doctor || caseData?.author?.id || caseData?.author;
  const isAuthor = userId && doctorId === userId;

  // Merge pinned and regular discussions for PDF export
  const allDiscussions = [...pinned, ...discussions];

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        {!hideDescription && <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ flex: 1 }}>{caseData.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setSuggestOpen(true)}
                sx={{ fontWeight: 600 }}
              >
                Suggest Diagnosis
              </Button>
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
          <Tab label={`Differentials (${caseData.differentials?.length || 0})`} sx={{ fontWeight: 600 }} />
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

        {activeTab === 2 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Structured Differential Diagnosis Workspace
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Explore, discuss, and evaluate competing diagnostic hypotheses for this case study.
            </Typography>

            {(!caseData.differentials || caseData.differentials.length === 0) ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                No differential diagnoses suggested yet. Suggest a diagnosis above to start the workspace.
              </Alert>
            ) : (
              <Stack spacing={3}>
                {caseData.differentials.map((diff: any, idx: number) => {
                  const isRuledOut = diff.status === 'ruled_out';
                  const isConfirmed = diff.status === 'confirmed';
                  const suggestorName = diff.suggestedBy 
                    ? `${diff.suggestedBy.firstName} ${diff.suggestedBy.lastName}`
                    : 'System';
                  return (
                    <Card 
                      key={diff._id || idx} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 4, 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        bgcolor: isConfirmed ? '#f0fdf4' : isRuledOut ? '#f8fafc' : '#fff',
                        opacity: isRuledOut ? 0.75 : 1
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography 
                          variant="h6" 
                          fontWeight={700} 
                          sx={{ 
                            textDecoration: isRuledOut ? 'line-through' : 'none',
                            color: isConfirmed ? 'success.main' : isRuledOut ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {diff.title}
                        </Typography>
                        <Chip 
                          label={diff.status.toUpperCase()} 
                          color={isConfirmed ? 'success' : isRuledOut ? 'default' : 'primary'} 
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Confidence Level: <strong>{diff.confidence}%</strong>
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={diff.confidence} 
                          color={isConfirmed ? 'success' : isRuledOut ? 'inherit' : 'primary'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="success.main" gutterBottom>
                            Supporting Evidence
                          </Typography>
                          {diff.supportingEvidence?.length > 0 ? (
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {diff.supportingEvidence.map((ev: string, eidx: number) => (
                                <li key={eidx}><Typography variant="body2">{ev}</Typography></li>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No supporting evidence provided.</Typography>
                          )}
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>
                            Excluding / Contradicting Evidence
                          </Typography>
                          {diff.excludingEvidence?.length > 0 ? (
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {diff.excludingEvidence.map((ev: string, eidx: number) => (
                                <li key={eidx}><Typography variant="body2">{ev}</Typography></li>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No excluding evidence provided.</Typography>
                          )}
                        </Grid>
                      </Grid>

                      {diff.notes && (
                        <Box sx={{ mb: 2, bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, borderLeft: '3px solid #64748b' }}>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{diff.notes}</Typography>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Suggested by: <strong>{suggestorName}</strong> on {new Date(diff.createdAt).toLocaleDateString()}
                      </Typography>

                      {/* Author Management Actions */}
                      {isAuthor && (
                        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                          {!isConfirmed && (
                            <Button 
                              variant="contained" 
                              color="success" 
                              size="small" 
                              onClick={() => handleUpdateDiffStatus(diff._id, 'confirmed')}
                            >
                              Confirm Diagnosis
                            </Button>
                          )}
                          {!isRuledOut && (
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small" 
                              onClick={() => handleUpdateDiffStatus(diff._id, 'ruled_out')}
                            >
                              Rule Out
                            </Button>
                          )}
                          {(isConfirmed || isRuledOut) && (
                            <Button 
                              variant="text" 
                              color="primary" 
                              size="small" 
                              onClick={() => handleUpdateDiffStatus(diff._id, 'active')}
                            >
                              Re-activate
                            </Button>
                          )}
                        </Stack>
                      )}

                      {/* Hypothesis specific comments */}
                      <Box sx={{ mt: 2, borderTop: '1px solid #e2e8f0', pt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                          Hypothesis Discussion ({diff.discussions?.length || 0})
                        </Typography>
                        <Stack spacing={1} sx={{ mb: 2, maxHeight: 150, overflowY: 'auto' }}>
                          {diff.discussions?.map((comm: any, cidx: number) => (
                            <Box key={cidx} sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
                              <Typography variant="caption" fontWeight={700}>
                                {comm.author ? `${comm.author.firstName} ${comm.author.lastName}` : 'User'}
                              </Typography>
                              <Typography variant="body2">{comm.content}</Typography>
                            </Box>
                          ))}
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            size="small"
                            placeholder="Add commentary..."
                            value={diffComments[diff._id] || ''}
                            onChange={e => setDiffComments(prev => ({ ...prev, [diff._id]: e.target.value }))}
                            fullWidth
                            onKeyDown={e => { if (e.key === 'Enter') handleAddDiffComment(diff._id); }}
                          />
                          <Button 
                            variant="contained" 
                            size="small" 
                            onClick={() => handleAddDiffComment(diff._id)}
                          >
                            Post
                          </Button>
                        </Stack>
                      </Box>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Suggest Diagnosis Dialog */}
      <Dialog 
        open={suggestOpen} 
        onClose={() => setSuggestOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Suggest Differential Diagnosis</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Diagnosis Title"
              placeholder="e.g. Acute Myocardial Infarction"
              value={diffTitle}
              onChange={e => setDiffTitle(e.target.value)}
              fullWidth
              required
            />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Confidence Level ({diffConfidence}%)
              </Typography>
              <Slider
                value={diffConfidence}
                onChange={(e, val) => setDiffConfidence(val as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>
            <TextField
              label="Supporting Evidence (comma-separated)"
              placeholder="e.g. Chest pain, ST elevation on ECG"
              value={diffSupporting}
              onChange={e => setDiffSupporting(e.target.value)}
              fullWidth
            />
            <TextField
              label="Excluding / Contradicting Evidence (comma-separated)"
              placeholder="e.g. Normal cardiac enzymes"
              value={diffExcluding}
              onChange={e => setDiffExcluding(e.target.value)}
              fullWidth
            />
            <TextField
              label="Clinical Notes"
              placeholder="Provide clinical rationale..."
              value={diffNotes}
              onChange={e => setDiffNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSuggestOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleSuggestDiff} 
            variant="contained" 
            disabled={!diffTitle.trim()}
          >
            Submit Suggestion
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
