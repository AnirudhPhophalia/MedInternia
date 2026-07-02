import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, IconButton, Stack, Collapse, Tooltip, Tabs, Tab, Card, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip } from '@mui/material';
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

  // Editing and Revision States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSymptoms, setEditSymptoms] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editTreatment, setEditTreatment] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<any>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const startEdit = () => {
    setEditTitle(caseData.title || '');
    setEditDescription(caseData.description || '');
    setEditSymptoms(caseData.symptoms?.join(', ') || '');
    setEditDiagnosis(caseData.diagnosis || '');
    setEditTreatment(caseData.treatment || '');
    setChangeSummary('');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.put(`/cases/${id}`, {
        title: editTitle,
        description: editDescription,
        symptoms: editSymptoms.split(',').map(s => s.trim()).filter(Boolean),
        diagnosis: editDiagnosis,
        treatment: editTreatment,
        changeSummary: changeSummary || 'Updated case details'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData(res.data.data.case);
      setIsEditing(false);
    } catch {
      setError('Failed to update case details');
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!window.confirm(`Are you sure you want to restore the case to version ${version}?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/cases/${id}/revisions/${version}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData(res.data.data.case);
      alert(`Case successfully restored to version ${version}`);
    } catch {
      setError('Failed to restore case version');
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
        {!hideDescription && !isEditing && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ flex: 1 }}>{caseData.title}</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {isAuthor && (
                  <Button variant="outlined" size="small" onClick={startEdit} sx={{ fontWeight: 600 }}>
                    Edit Case
                  </Button>
                )}
                <PdfExportButton caseData={caseData} discussions={allDiscussions} />
              </Stack>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>{caseData.description}</Typography>
          </>
        )}

        {isEditing && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3, border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Edit Case Details
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Case Title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Description"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                multiline
                rows={4}
                fullWidth
              />
              <TextField
                label="Symptoms (comma-separated)"
                value={editSymptoms}
                onChange={e => setEditSymptoms(e.target.value)}
                fullWidth
              />
              <TextField
                label="Diagnosis"
                value={editDiagnosis}
                onChange={e => setEditDiagnosis(e.target.value)}
                fullWidth
              />
              <TextField
                label="Treatment"
                value={editTreatment}
                onChange={e => setEditTreatment(e.target.value)}
                fullWidth
              />
              <TextField
                label="Change Summary"
                placeholder="What changes did you make? (Required)"
                value={changeSummary}
                onChange={e => setChangeSummary(e.target.value)}
                required
                fullWidth
                error={!changeSummary.trim()}
                helperText={!changeSummary.trim() ? 'Change Summary is required for version tracking.' : ''}
              />
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSaveEdit}
                  disabled={!changeSummary.trim() || !editTitle.trim() || !editDescription.trim()}
                >
                  Save Changes
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        <Tabs 
          value={activeTab} 
          onChange={(e, val) => setActiveTab(val)} 
          centered 
          sx={{ my: 3, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab label="Clinical Timeline" sx={{ fontWeight: 600 }} />
          <Tab label={`Discussions (${allDiscussions.length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`History (${caseData.revisions?.length || 0})`} sx={{ fontWeight: 600 }} />
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
              Case Revision History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Track all modifications, updates, and restorative actions performed on this clinical case study.
            </Typography>
            {(!caseData.revisions || caseData.revisions.length === 0) ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                This is the original version of the case. No revision history has been recorded yet.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {caseData.revisions.map((rev: any, idx: number) => {
                  const updaterName = rev.updatedBy 
                    ? `Dr. ${rev.updatedBy.firstName} ${rev.updatedBy.lastName}`
                    : 'System/Author';
                  return (
                    <Card key={idx} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip label={`Version ${rev.version}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(rev.updatedAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {rev.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, borderLeft: '3px solid #1976d2' }}>
                        <strong>Change Summary:</strong> {rev.changeSummary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Edited by: {updaterName}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => {
                            setSelectedRevision(rev);
                            setCompareOpen(true);
                          }}
                        >
                          Compare Version
                        </Button>
                        {isAuthor && (
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="warning" 
                            onClick={() => handleRestoreVersion(rev.version)}
                          >
                            Restore Version
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Compare Version Dialog */}
      <Dialog 
        open={compareOpen} 
        onClose={() => setCompareOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Compare Version {selectedRevision?.version} with Current Version
        </DialogTitle>
        <DialogContent dividers>
          {selectedRevision && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" color="primary" fontWeight={700} gutterBottom>
                  Version {selectedRevision.version} (Historical)
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Title</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                  {selectedRevision.title}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Description</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
                  {selectedRevision.description}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Symptoms</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                  {selectedRevision.symptoms?.join(', ') || 'None'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Diagnosis</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                  {selectedRevision.diagnosis || 'Not specified'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Treatment</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                  {selectedRevision.treatment || 'Not specified'}
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" color="success.main" fontWeight={700} gutterBottom>
                  Current Active Version
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Title</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: 2 }}>
                  {caseData.title}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Description</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
                  {caseData.description}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Symptoms</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: 2 }}>
                  {caseData.symptoms?.join(', ') || 'None'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Diagnosis</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: 2 }}>
                  {caseData.diagnosis || 'Not specified'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 1 }}>Treatment</Typography>
                <Typography variant="body2" paragraph sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: 2 }}>
                  {caseData.treatment || 'Not specified'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCompareOpen(false)} variant="contained" sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
