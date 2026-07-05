import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  TextField,
  IconButton,
  Stack,
  Collapse,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { MessageCircleReply, Pin, CheckCircle2, Sparkles, Stethoscope, Activity, Award } from 'lucide-react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import PdfExportButton from '../../components/PdfExportButton';
import ClinicalTimeline from '../../components/ClinicalTimeline';

export default function CaseDiscussion({ id: propId, modalMode, hideDescription }: { id?: string, modalMode?: boolean, hideDescription?: boolean }) {
  const router = useRouter();
  const id = propId || router.query.id;
  const [caseData, setCaseData] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [solving, setSolving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<any>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [openReplies, setOpenReplies] = useState<{[key: string]: boolean}>({});

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const canModerate = currentUser && ['admin', 'doctor', 'moderator'].includes(currentUser.userType);

  // Clinical Sandbox State
  const [sandboxAttempt, setSandboxAttempt] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState('');
  const [testType, setTestType] = useState('ECG');
  const [proposedDiagnosis, setProposedDiagnosis] = useState('');

  // Fetch Case Data & Profile details
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    
    // Fetch profile to check solved list
    if (token) {
      api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const user = res.data.data.user;
        setCurrentUser(user);
        if (user.solvedCases) {
          setIsSolved(user.solvedCases.some((scId: string) => scId.toString() === id.toString()));
        }
      })
      .catch(err => console.warn('Failed to fetch profile', err));
    }

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

    // Start / Load Clinical Sandbox Session
    api.post(`/cases/${id}/sandbox/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setSandboxAttempt(res.data.data.attempt);
      })
      .catch(err => {
        console.warn('Failed to load sandbox:', err);
      });
  }, [id]);

  const handleLike = async (commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const res = await api.get(`/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = res.data.data.case.comments || [];
      setPinned(all.filter((c: any) => c.pinned));
      setDiscussions(all.filter((c: any) => !c.pinned));
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

  const handleOrderTest = async () => {
    if (!testType) return;
    setSandboxLoading(true);
    setSandboxError('');
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/cases/${id}/sandbox/order-test`, { testType }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSandboxAttempt(res.data.data.attempt);
      setSandboxLoading(false);
    } catch (err: any) {
      setSandboxError(err.response?.data?.message || 'Failed to order test');
      setSandboxLoading(false);
    }
  };

  const handleSubmitDiagnosis = async () => {
    if (!proposedDiagnosis.trim()) return;
    setSandboxLoading(true);
    setSandboxError('');
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/cases/${id}/sandbox/submit`, { proposedDiagnosis }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSandboxAttempt(res.data.data.attempt);
      // Re-fetch the case to get revealed diagnosis & treatment!
      const caseRes = await api.get(`/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData(caseRes.data.data.case);
      setSandboxLoading(false);
    } catch (err: any) {
      setSandboxError(err.response?.data?.message || 'Failed to submit diagnosis');
      setSandboxLoading(false);
    }
  };

  const handleDiscussion = async () => {
    try {
      const token = localStorage.getItem('token');
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

  const handleReply = (comment: any) => {
    setReplyTo(comment);
    setReplyContent('');
  };

  const submitReply = async () => {
    if (!replyContent.trim()) return;
    await handleDiscussion();
  };

  const handlePin = async (commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/comments/${commentId}/pin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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

  const handleSolveCase = async () => {
    setSolving(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`/cases/${id}/solve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSolved(true);
      setSolving(false);
      setSuccess('Case marked as solved successfully! You earned +5 points.');
      setError('');
    } catch (err) {
      setSolving(false);
      setError('Failed to mark case as solved');
      setSuccess('');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Container maxWidth="md" sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!caseData) return null;

  const caseAuthorName = caseData.doctor
    ? `${caseData.doctor.firstName || ''} ${caseData.doctor.lastName || ''}`.trim()
    : 'Unknown Clinician';
  const caseAuthorAvatar = caseData.doctor?.profilePicture || undefined;

  // Merge pinned and regular discussions for PDF export
  const allDiscussions = [...pinned, ...discussions];

  // Comments / Peer reviews sub-panel JSX
  const discussionPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: 'text.primary' }}>
        Peer Discussions
      </Typography>

      {/* Pinned keypoints */}
      {pinned.length > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#fffbe6', borderRadius: 3, border: '1.5px solid #ffe066' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#b7860b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Pin size={16} /> Key Pinned Insights
          </Typography>
          {pinned.map((c, idx) => {
            const authorName = c.author ? `${c.author.firstName || ''} ${c.author.lastName || ''}`.trim() : 'Unknown';
            return (
              <Box key={c._id || idx} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  "{c.content}"
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    — {authorName} ({c.author?.userType})
                  </Typography>
                  {canModerate && (
                    <Button size="small" onClick={() => handleUnpin(c._id)} sx={{ p: 0, minWidth: 0, fontSize: 11, color: 'error.main' }}>
                      Unpin
                    </Button>
                  )}
                </Stack>
              </Box>
            );
          })}
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
        <Tab label="Clinical Sandbox" sx={{ fontWeight: 600 }} />
      </Tabs>

      {/* Main comments feed */}
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: '500px', pr: 1, mb: 2 }}>
        {discussions.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            No peer reviews yet. Share your diagnosis and feedback!
          </Typography>
        ) : (
          discussions
            .filter((c) => !c.replyTo)
            .map((c, idx) => {
              const isMe = c.author?._id === userId;
              const authorName = c.author ? `${c.author.firstName || ''} ${c.author.lastName || ''}`.trim() : 'Unknown';
              const initial = authorName[0]?.toUpperCase() || 'U';

              return (
                <Box key={c._id || idx} sx={{ mb: 3 }}>
                  <Stack direction={isMe ? 'row-reverse' : 'row'} gap={1.5} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: isMe ? 'primary.main' : 'secondary.main', width: 36, height: 36, fontWeight: 700 }}>
                      {initial}
                    </Avatar>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: isMe ? 'primary.light' : '#f1f5f9',
                        color: 'text.primary',
                        maxWidth: '85%',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'primary.dark', mb: 0.5 }}>
                        {authorName} <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>({c.author?.userType})</span>
                      </Typography>
                      <Typography variant="body1" fontSize={15} sx={{ whiteSpace: 'pre-line' }}>
                        {c.content}
                      </Typography>

                      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 1 }}>
                        <Typography fontSize={11} color="text.disabled">
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>

                        <Tooltip title="Like comment">
                          <IconButton size="small" onClick={() => handleLike(c._id)} sx={{ p: 0.5 }}>
                            <ThumbUpAltOutlinedIcon sx={{ fontSize: 16, color: c.likes?.includes(userId) ? 'primary.main' : 'text.disabled' }} />
                          </IconButton>
                        </Tooltip>

                        {canModerate && (
                          <Tooltip title="Pin insight">
                            <IconButton size="small" onClick={() => handlePin(c._id)} sx={{ p: 0.5, color: 'text.disabled' }}>
                              <Pin size={16} />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Button size="small" onClick={() => handleReply(c)} sx={{ fontSize: 11, minWidth: 0, p: 0 }}>
                          Reply
                        </Button>

                        {c.replies && c.replies.length > 0 && (
                          <Button size="small" sx={{ fontSize: 11, minWidth: 0, p: 0 }} onClick={() => setOpenReplies(prev => ({ ...prev, [c._id]: !prev[c._id] }))}>
                            {openReplies[c._id] ? 'Hide Replies' : `Replies (${c.replies.length})`}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Replies nesting */}
                  {c.replies && c.replies.length > 0 && openReplies[c._id] && (
                    <Box sx={{ mt: 1, ml: 6, pl: 2, borderLeft: '2px solid #cbd5e1' }}>
                      {discussions
                        .filter((r: any) => r.replyTo === c._id)
                        .map((r: any, rIdx: number) => {
                          const replyAuthorName = r.author ? `${r.author.firstName || ''} ${r.author.lastName || ''}`.trim() : 'Unknown';
                          return (
                            <Box key={r._id || rIdx} sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: 'divider', fontSize: 13, fontWeight: 700 }}>
                                {replyAuthorName[0]?.toUpperCase()}
                              </Avatar>
                              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 3, width: '100%' }}>
                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                  {replyAuthorName} <span style={{ fontSize: '10px', opacity: 0.7 }}>({r.author?.userType})</span>
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>{r.content}</Typography>
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  )}
                </Box>
              );
            })
        )}

        {activeTab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
              color: '#fff', 
              borderRadius: 4, 
              boxShadow: '0 8px 32px rgba(30, 60, 114, 0.2)',
              mb: 3
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1.5 }}>
                  <Stethoscope size={28} />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>Clinical Reasoning Sandbox</Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Train your diagnostic skills. Analyze patient presentation, order virtual tests, and propose a diagnosis to compare against the expert decision.
                </Typography>
              </CardContent>
            </Card>

            {/* Patient Presentation Overview */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3c72', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Activity size={20} /> Patient Presentation
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>AGE</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#334155' }}>
                      {caseData.patientInfo?.age ? `${caseData.patientInfo.age} years` : 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GENDER</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>
                      {caseData.patientInfo?.gender || 'Not specified'}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>CHIEF COMPLAINT & SYMPTOMS</Typography>
                <Typography variant="body1" sx={{ color: '#334155', mb: 2 }}>
                  {caseData.symptoms && caseData.symptoms.length > 0 
                    ? caseData.symptoms.join(', ') 
                    : 'No symptoms listed'}
                </Typography>
              </CardContent>
            </Card>

            {sandboxError && <Alert severity="error" sx={{ mb: 3 }}>{sandboxError}</Alert>}

            {/* Sandbox State */}
            {sandboxAttempt && !sandboxAttempt.isCompleted ? (
              <>
                {/* Ordered Tests Section */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3c72', mb: 2 }}>
                      1. Order Virtual Diagnostic Tests
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                      Choose tests carefully to maintain high diagnostic efficiency. Each test ordered deducts points from the efficiency bonus.
                    </Typography>
                    
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="test-type-label">Select Test</InputLabel>
                        <Select
                          labelId="test-type-label"
                          value={testType}
                          label="Select Test"
                          onChange={(e) => setTestType(e.target.value)}
                        >
                          <MenuItem value="ECG">ECG / Electrocardiogram</MenuItem>
                          <MenuItem value="Blood Work">Blood Work / Labs</MenuItem>
                          <MenuItem value="X-Ray">Chest X-Ray</MenuItem>
                          <MenuItem value="CT Scan">CT Scan</MenuItem>
                          <MenuItem value="MRI">MRI</MenuItem>
                          <MenuItem value="Urinalysis">Urinalysis</MenuItem>
                        </Select>
                      </FormControl>
                      <Button 
                        variant="contained" 
                        onClick={handleOrderTest} 
                        disabled={sandboxLoading}
                        sx={{ 
                          bgcolor: '#1e3c72', 
                          '&:hover': { bgcolor: '#2a5298' }, 
                          whiteSpace: 'nowrap',
                          borderRadius: 2,
                          px: 3
                        }}
                      >
                        {sandboxLoading ? <CircularProgress size={20} color="inherit" /> : 'Order Test'}
                      </Button>
                    </Stack>

                    {/* Display ordered tests list */}
                    {sandboxAttempt.orderedTests && sandboxAttempt.orderedTests.length > 0 ? (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                          Diagnostic Results Log ({sandboxAttempt.orderedTests.length})
                        </Typography>
                        {sandboxAttempt.orderedTests.map((test: any, idx: number) => (
                          <Box key={idx} sx={{ 
                            p: 2, 
                            bgcolor: '#f8fafc', 
                            borderRadius: 2.5, 
                            borderLeft: '4px solid #3b82f6',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                {test.testType}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {test.orderedAt ? new Date(test.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.875rem', mt: 1 }}>
                              {test.result}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px dashed #cbd5e1' }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          No tests ordered yet. Select a test from the menu above.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Submit Diagnosis Section */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3c72', mb: 2 }}>
                      2. Submit Proposed Diagnosis
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                      Once you have reviewed the presentation and test findings, type your diagnosis below. We will evaluate its semantic match against the expert diagnosis.
                    </Typography>

                    <TextField
                      fullWidth
                      label="Proposed Diagnosis"
                      placeholder="e.g. Acute Inferior Wall Myocardial Infarction (STEMI)"
                      value={proposedDiagnosis}
                      onChange={(e) => setProposedDiagnosis(e.target.value)}
                      sx={{ mb: 3, mt: 1 }}
                      size="medium"
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmitDiagnosis}
                      disabled={sandboxLoading || !proposedDiagnosis.trim()}
                      sx={{ 
                        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
                        py: 1.5,
                        borderRadius: 2.5,
                        fontWeight: 700,
                        fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(30, 60, 114, 0.2)'
                      }}
                    >
                      {sandboxLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit Diagnosis'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : sandboxAttempt && sandboxAttempt.isCompleted ? (
              <Box>
                {/* Results Dashboard Card */}
                <Card sx={{ 
                  borderRadius: 4, 
                  border: '1.5px solid #22c55e', 
                  mb: 3, 
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.08)',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ bgcolor: '#f0fdf4', p: 3, borderBottom: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircle2 size={28} color="#22c55e" />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534' }}>Sandbox Completed!</Typography>
                        <Typography variant="caption" sx={{ color: '#15803d' }}>Diagnosis evaluated successfully</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, display: 'block' }}>TOTAL SCORE</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#166534' }}>
                        +{sandboxAttempt.pointsAwarded || 0} pts
                      </Typography>
                    </Box>
                  </Box>
                  
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, textAlign: 'center' }}>
                          <Award size={24} color="#3b82f6" style={{ margin: '0 auto 8px' }} />
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>SIMILARITY MATCH</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.5 }}>
                            {sandboxAttempt.similarityScore ? `${(sandboxAttempt.similarityScore * 100).toFixed(1)}%` : '0%'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, textAlign: 'center' }}>
                          <Activity size={24} color="#ef4444" style={{ display: 'block', margin: '0 auto 8px' }} />
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>TESTS ORDERED</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.5 }}>
                            {sandboxAttempt.orderedTests?.length || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, textAlign: 'center' }}>
                          <Award size={24} color="#eab308" style={{ margin: '0 auto 8px' }} />
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>EFFICIENCY BONUS</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.5 }}>
                            +{Math.max(0, 10 - 2 * (sandboxAttempt.orderedTests?.length || 0))} pts
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2.5 }} />

                    {/* Comparison */}
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>YOUR PROPOSED DIAGNOSIS</Typography>
                        <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2, mt: 0.5, borderLeft: '3px solid #64748b' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#334155' }}>
                            {sandboxAttempt.proposedDiagnosis}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>EXPERT DIAGNOSIS</Typography>
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, mt: 0.5, borderLeft: '3px solid #22c55e' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#166534' }}>
                            {caseData.diagnosis || "No diagnosis details revealed."}
                          </Typography>
                        </Box>
                      </Box>

                      {caseData.treatment && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#1e3c72', fontWeight: 700 }}>RECOMMENDED TREATMENT PLAN</Typography>
                          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, mt: 0.5, borderLeft: '3px solid #1e3c72' }}>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              {caseData.treatment}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Ordered Tests Log History */}
                {sandboxAttempt.orderedTests && sandboxAttempt.orderedTests.length > 0 && (
                  <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 2 }}>
                        Diagnostic Log History
                      </Typography>
                      <Stack spacing={2}>
                        {sandboxAttempt.orderedTests.map((test: any, idx: number) => (
                          <Box key={idx} sx={{ 
                            p: 2, 
                            bgcolor: '#f8fafc', 
                            borderRadius: 2.5, 
                            borderLeft: '4px solid #cbd5e1'
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>
                              {test.testType}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {test.result}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Input controls */}
      {replyTo ? (
        <Box sx={{ p: 2, bgcolor: '#e0f2fe', borderRadius: 3, border: '1px solid #bae6fd' }}>
          <Typography variant="caption" color="primary.dark" fontWeight={700}>
            Replying to {replyTo.author?.firstName || 'user'}
          </Typography>
          <TextField
            placeholder="Type your reply..."
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1, bgcolor: 'white', borderRadius: 2 }}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            <Button size="small" variant="text" onClick={() => setReplyTo(null)}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={submitReply} disabled={!replyContent.trim()}>
              Send Reply
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack direction="row" gap={1} alignItems="flex-end" sx={{ mt: 'auto', pt: 1 }}>
          <TextField
            placeholder="Write comments, peer advice, or ask questions..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            fullWidth
            multiline
            maxRows={4}
            InputProps={{ sx: { borderRadius: '12px', bgcolor: '#f8fbff' } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleDiscussion}
            disabled={!comment.trim()}
            sx={{ height: 48, borderRadius: '12px', px: 3 }}
          >
            Post
          </Button>
        </Stack>
      )}
    </Box>
  );

  // If in Modal Mode, just display discussions
  if (modalMode) {
    return discussionPanel;
  }

  // Full detail page layout
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        component={Link}
        href="/cases"
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
      >
        Back to Cases
      </Button>

      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={4}>
        {/* Left Column: Case details or Timeline (depending on active tab) */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h3" fontWeight={900} color="text.primary" sx={{ flex: 1, letterSpacing: -0.5, mb: 0 }}>
                {caseData.title}
              </Typography>
              <PdfExportButton caseData={caseData} discussions={allDiscussions} />
            </Box>

            {/* AI Prominent Badges */}
            <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mb: 3, mt: 1 }}>
              {caseData.specialization && (
                <Chip
                  label={`🩺 specialty: ${caseData.specialization}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: '8px', fontSize: '13px', px: 0.5 }}
                />
              )}
              {caseData.difficulty && (
                <Chip
                  label={`⚡ Difficulty: ${caseData.difficulty}`}
                  sx={{
                    fontWeight: 700,
                    borderRadius: '8px',
                    fontSize: '13px',
                    px: 0.5,
                    textTransform: 'capitalize',
                    ...(() => {
                      switch (caseData.difficulty.toLowerCase()) {
                        case 'beginner':
                          return { bgcolor: '#e6fffa', color: '#00a389', border: '1px solid #b2f5ea' };
                        case 'advanced':
                        case 'complex':
                          return { bgcolor: '#fff5f5', color: '#e53e3e', border: '1px solid #feb2b2' };
                        default:
                          return { bgcolor: '#fffaf0', color: '#dd6b20', border: '1px solid #fbd38d' };
                      }
                    })()
                  }}
                />
              )}
              {isSolved && (
                <Chip
                  icon={<CheckCircle2 size={16} />}
                  label="Solved"
                  color="success"
                  sx={{ fontWeight: 700, borderRadius: '8px', fontSize: '13px', px: 0.5 }}
                />
              )}
              {caseData.tags && caseData.tags.map((tag: string) => (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  sx={{ fontWeight: 700, borderRadius: '8px', fontSize: '13px', px: 0.5, bgcolor: '#f1f5f9', color: '#475569' }}
                />
              ))}
            </Stack>

            {/* Author and Date Meta Row */}
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
              <Avatar src={caseAuthorAvatar} sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 }}>
                {caseAuthorName[0]}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700} color="text.primary">
                  {caseAuthorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Published {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </Typography>
              </Box>

              {/* Mark as Solved Button */}
              {userId && !isSolved && (
                <Button
                  variant="contained"
                  color="success"
                  disabled={solving}
                  startIcon={solving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={18} />}
                  onClick={handleSolveCase}
                  sx={{
                    ml: 'auto',
                    borderRadius: '10px',
                    fontWeight: 700,
                    bgcolor: '#10b981',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    '&:hover': {
                      bgcolor: '#059669',
                      boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
                    }
                  }}
                >
                  Mark as Solved
                </Button>
              )}
            </Stack>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{ mb: 3, borderBottom: '1px solid #e2e8f0' }}
          >
            <Tab label="Case Details" sx={{ fontWeight: 600 }} />
            <Tab label="Clinical Timeline" sx={{ fontWeight: 600 }} />
          </Tabs>

          {activeTab === 0 && (
            <>
              <Divider sx={{ mb: 4 }} />

              {/* Patient Info Card */}
              {caseData.patientInfo && (caseData.patientInfo.age || caseData.patientInfo.gender || (caseData.patientInfo.medicalHistory && caseData.patientInfo.medicalHistory.length > 0) || (caseData.patientInfo.currentMedications && caseData.patientInfo.currentMedications.length > 0)) && (
                <Card sx={{ p: 2.5, mb: 4, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fafcff' }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 Patient Information
                  </Typography>
                  <Grid container spacing={2}>
                    {caseData.patientInfo.age && (
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Age</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">{caseData.patientInfo.age} years</Typography>
                      </Grid>
                    )}
                    {caseData.patientInfo.gender && (
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Gender</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ textTransform: 'capitalize' }}>{caseData.patientInfo.gender}</Typography>
                      </Grid>
                    )}
                    {caseData.patientInfo.medicalHistory && caseData.patientInfo.medicalHistory.length > 0 && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Medical History</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">{caseData.patientInfo.medicalHistory.join(', ')}</Typography>
                      </Grid>
                    )}
                    {caseData.patientInfo.currentMedications && caseData.patientInfo.currentMedications.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Current Medications</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">{caseData.patientInfo.currentMedications.join(', ')}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Card>
              )}

              {/* Description */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: 'primary.dark' }}>
                  Clinical History & Details
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', fontSize: '1.05rem', lineHeight: 1.7 }}>
                  {caseData.description}
                </Typography>
              </Box>

              {/* Supporting materials */}
              {caseData.images && caseData.images.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: 'primary.dark' }}>
                    Supporting Medical Media (Images)
                  </Typography>
                  <Grid container spacing={2}>
                    {caseData.images.map((img: string, idx: number) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                        <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
                          <CardMedia
                            component="img"
                            image={img}
                            alt={`Clinical supporting photo ${idx + 1}`}
                            sx={{ height: 260, objectFit: 'cover', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
                            onClick={() => window.open(img, '_blank')}
                          />
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* AI Clinical Insights card */}
              <Card
                sx={{
                  borderRadius: 4,
                  border: '1.5px solid rgba(0, 114, 255, 0.15)',
                  background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
                  boxShadow: '0 4px 20px rgba(0, 114, 255, 0.05)',
                  mb: 4,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" gap={1.2} sx={{ mb: 2 }}>
                    <Box sx={{ bgcolor: 'primary.light', p: 0.8, borderRadius: '8px', color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                      <Sparkles size={20} />
                    </Box>
                    <Typography variant="h6" fontWeight={800} color="primary.dark">
                      AI Clinical Insights
                    </Typography>
                  </Stack>

                  {caseData.symptoms && caseData.symptoms.length > 0 && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Extracted symptoms:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {caseData.symptoms.map((s: string) => (
                          <Chip key={s} label={s} size="small" sx={{ bgcolor: '#ebf4ff', color: 'primary.dark', fontWeight: 600 }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {caseData.diagnosis && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Likely Diagnosis:
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ mt: 0.5, bgcolor: '#f1f5f9', p: 1.5, borderRadius: 2 }}>
                        💡 {caseData.diagnosis}
                      </Typography>
                    </Box>
                  )}

                  {caseData.treatment && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Recommended Treatment / Management:
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mt: 0.7, whiteSpace: 'pre-line', bgcolor: '#fdfdfd', border: '1px solid #e2e8f0', p: 2, borderRadius: 2 }}>
                        {caseData.treatment}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 1 && (
            <ClinicalTimeline caseData={caseData} discussions={allDiscussions} />
          )}

          {/* Pinned insight placeholder container */}
          <Box sx={{ mb: 1 }} />
        </Grid>

        {/* Right Column: Peer review discussion comments */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Card
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 4,
              height: '100%',
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              position: 'sticky',
              top: '84px', // account for navbar
            }}
          >
            {discussionPanel}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
