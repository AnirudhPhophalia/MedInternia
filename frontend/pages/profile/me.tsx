import React, { useEffect, useState } from "react";
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import VerifiedIcon from '@mui/icons-material/Verified';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import Link from 'next/link';
import api from '../../utils/api';

export default function MeProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Bookmark Collections States
  const [collections, setCollections] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('General');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/bookmarks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(res.data?.data?.collections || []);
    } catch (err) {
      console.error('Failed to fetch collections', err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreateCollection = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/bookmarks', {
        title: newTitle,
        description: newDesc,
        specialty: newSpecialty
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewTitle('');
      setNewDesc('');
      setNewSpecialty('General');
      setCreateOpen(false);
      fetchCollections();
    } catch (err) {
      console.error('Failed to create collection', err);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/bookmarks/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedCollection?._id === collectionId) {
        setSelectedCollection(null);
      }
      fetchCollections();
    } catch (err) {
      console.error('Failed to delete collection', err);
    }
  };

  const handleRemoveBookmark = async (collectionId: string, caseId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/bookmarks/${collectionId}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCollections();
      // Update selectedCollection view
      setCollections(prev => {
        const updated = prev.map(c => {
          if (c._id === collectionId) {
            const copy = { ...c };
            copy.bookmarks = copy.bookmarks.filter((b: any) => b.case?._id !== caseId);
            return copy;
          }
          return c;
        });
        const current = updated.find(c => c._id === collectionId);
        if (current) setSelectedCollection(current);
        return updated;
      });
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  const handleUpdateNote = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/bookmarks/${selectedCollection._id}/cases/${selectedCaseId}/note`, {
        note: editNoteText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNoteOpen(false);
      setEditNoteText('');
      setSelectedCaseId('');
      fetchCollections();
      // Update selectedCollection view
      setCollections(prev => {
        const updated = prev.map(c => {
          if (c._id === selectedCollection._id) {
            const copy = { ...c };
            copy.bookmarks = copy.bookmarks.map((b: any) => {
              if (b.case?._id === selectedCaseId) {
                return { ...b, note: editNoteText };
              }
              return b;
            });
            return copy;
          }
          return c;
        });
        const current = updated.find(c => c._id === selectedCollection._id);
        if (current) setSelectedCollection(current);
        return updated;
      });
    } catch (err) {
      console.error('Failed to update note', err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
          router.replace('/auth/login');
          return;
        }

        const res = await api.get(`/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data?.data?.user || res.data?.user || res.data);
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxWidth={700} mx="auto" my={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!user) return null;

  // Specialties list
  const specialties = user.specialization ? [user.specialization] : (user.interests || []);

  return (
    <Box maxWidth={800} mx="auto" my={4} px={2}>
      {/* Profile Header Card */}
      <Card sx={{ p: 4, borderRadius: 4, mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e3eafc' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Avatar 
              src={user.profilePicture} 
              sx={{ 
                width: 100, 
                height: 100, 
                fontSize: 40, 
                fontWeight: 700,
                bgcolor: 'primary.main',
                mx: { xs: 'auto', sm: 'left' } 
              }} 
            >
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} flexWrap="wrap">
              <Typography variant="h4" fontWeight={800} color="#1565c0">
                {user.userType === 'doctor' ? 'Dr.' : ''} {user.firstName} {user.lastName}
              </Typography>
              {(user.isVerified || user.isVerifiedDoctor) && (
                <VerifiedIcon color="success" sx={{ fontSize: 28 }} />
              )}
            </Stack>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
              {user.specialization || user.medicalSchool || 'Medical Professional'}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ mt: 1.5 }}>
              <Chip
                label={user.userType?.toUpperCase()}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              {(user.isVerified || user.isVerifiedDoctor) && (
                <Chip
                  label="Verified Practitioner"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 'auto' }} sx={{ textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              component={Link}
              href="/profile/edit"
              startIcon={<EditIcon />}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Bio / Summary */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={700} color="#333" sx={{ mb: 1 }}>
            Professional Summary
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {user.bio || "No professional summary added yet. Update your profile to write a summary."}
          </Typography>
        </Box>
      </Card>

      {/* Grid for details and metrics */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          {/* Stats Overview */}
          <Card sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Activity Stats
            </Typography>
            <Stack spacing={2.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Points Balance</Typography>
                <Typography variant="subtitle1" fontWeight={800} color="primary">{user.points || 0}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Cases Analyzed</Typography>
                <Typography variant="subtitle1" fontWeight={800}>{user.casesAnalyzed || 0}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Peer Reviews Given</Typography>
                <Typography variant="subtitle1" fontWeight={800}>{user.peerReviewsGiven || 0}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Certificates Earned</Typography>
                <Typography variant="subtitle1" fontWeight={800} color="success.main">{user.certificatesEarned || 0}</Typography>
              </Stack>
            </Stack>
          </Card>

          {/* Quick Links */}
          <Card sx={{ p: 3, borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Quick Navigation
            </Typography>
            <Stack spacing={1}>
              <Button fullWidth variant="outlined" component={Link} href="/profile/achievements" sx={{ borderRadius: 2, justifyContent: 'flex-start', textTransform: 'none' }} startIcon={<EmojiEventsIcon />}>
                My Achievements
              </Button>
              <Button fullWidth variant="outlined" component={Link} href="/profile/cases" sx={{ borderRadius: 2, justifyContent: 'flex-start', textTransform: 'none' }} startIcon={<LibraryBooksIcon />}>
                My Cases
              </Button>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {/* Specialties / Clinical Focus */}
          <Card sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Clinical Specialties & Focus
            </Typography>
            {specialties.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No clinical specialties listed.</Typography>
            ) : (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {specialties.map((spec: string) => (
                  <Chip key={spec} label={spec} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
            )}
          </Card>

          {/* Academic & Background Info */}
          <Card sx={{ p: 3, borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Background Details
            </Typography>
            <Stack spacing={2}>
              {user.medicalSchool && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <SchoolIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Medical School</Typography>
                    <Typography variant="body2" fontWeight={600}>{user.medicalSchool}</Typography>
                  </Box>
                </Stack>
              )}
              {user.licenseNumber && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <VerifiedIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">License Number</Typography>
                    <Typography variant="body2" fontWeight={600}>{user.licenseNumber}</Typography>
                  </Box>
                </Stack>
              )}
              {user.experience !== undefined && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <VerifiedIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Years of Experience</Typography>
                    <Typography variant="body2" fontWeight={600}>{user.experience} Years</Typography>
                  </Box>
                </Stack>
              )}
              <Stack direction="row" spacing={2} alignItems="center">
                <SchoolIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Academic Year / Year of Study</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {user.yearOfStudy ? `Year ${user.yearOfStudy}` : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Bookmark Collections Section */}
      <Card sx={{ p: 4, borderRadius: 4, mt: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5" fontWeight={800} color="#1565c0">
            Medical Bookmark Collections
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Create New Collection
          </Button>
        </Box>

        {collections.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            No bookmark collections created yet. Organize saved cases by creating your first folder!
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {collections.map((coll) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={coll._id}>
                <Card 
                  onClick={() => setSelectedCollection(coll)}
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 3, 
                    border: '1px solid #e2e8f0', 
                    cursor: 'pointer',
                    bgcolor: selectedCollection?._id === coll._id ? '#f0f7ff' : '#fff',
                    borderColor: selectedCollection?._id === coll._id ? '#90caf9' : '#e2e8f0',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 2 }
                  }}
                >
                  <Typography variant="h6" fontWeight={700} noWrap sx={{ mb: 1 }}>
                    📁 {coll.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {coll.description || 'No description provided.'}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip label={coll.specialty} color="secondary" size="small" sx={{ fontWeight: 600 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {coll.bookmarks?.length || 0} cases
                    </Typography>
                  </Stack>
                  <Button 
                    variant="text" 
                    color="error" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(coll._id);
                    }}
                    sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Delete Folder
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Selected Collection Cases View */}
        {selectedCollection && (
          <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Folder: {selectedCollection.title} ({selectedCollection.bookmarks?.length || 0} Saved Cases)
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setSelectedCollection(null)} sx={{ textTransform: 'none' }}>
                Close View
              </Button>
            </Box>
            
            {selectedCollection.bookmarks?.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                This folder is currently empty. Bookmark cases from the Case Browsing list to populate this collection.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {selectedCollection.bookmarks.map((bm: any) => {
                  if (!bm.case) return null;
                  return (
                    <Card key={bm.case._id} sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700} component={Link} href={`/cases/${bm.case._id}`} sx={{ textDecoration: 'none', color: '#1565c0', '&:hover': { textDecoration: 'underline' } }}>
                            {bm.case.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Specialization: <strong>{bm.case.specialization}</strong> | Difficulty: <strong>{bm.case.difficulty}</strong>
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => {
                              setSelectedCaseId(bm.case._id);
                              setEditNoteText(bm.note || '');
                              setNoteOpen(true);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Edit Note
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            onClick={() => handleRemoveBookmark(selectedCollection._id, bm.case._id)}
                            sx={{ textTransform: 'none' }}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Box>
                      {bm.note && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fffbf0', borderLeft: '3px solid #f59e0b', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight={700} color="#b45309" display="block">Private Note Annotation:</Typography>
                          <Typography variant="body2">{bm.note}</Typography>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Card>

      {/* Create Collection Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>New Bookmark Collection</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField 
              label="Collection Title" 
              placeholder="e.g. Cardiology Exam Prep" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              fullWidth 
              required 
            />
            <TextField 
              label="Description" 
              placeholder="Describe what study group or purpose this serves..." 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
              multiline 
              rows={2} 
              fullWidth 
            />
            <FormControl fullWidth>
              <InputLabel>Specialty Theme</InputLabel>
              <Select
                value={newSpecialty}
                label="Specialty Theme"
                onChange={e => setNewSpecialty(e.target.value)}
              >
                <MenuItem value="General">General Practice</MenuItem>
                <MenuItem value="Cardiology">Cardiology</MenuItem>
                <MenuItem value="Pediatrics">Pediatrics</MenuItem>
                <MenuItem value="Neurology">Neurology</MenuItem>
                <MenuItem value="Internal Medicine">Internal Medicine</MenuItem>
                <MenuItem value="Oncology">Oncology</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreateCollection} variant="contained" disabled={!newTitle.trim()}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Personal Study Annotation</DialogTitle>
        <DialogContent dividers>
          <TextField 
            label="Private Study Notes" 
            placeholder="Write details, takeaways, or research points for this case study..." 
            value={editNoteText} 
            onChange={e => setEditNoteText(e.target.value)} 
            multiline 
            rows={4} 
            fullWidth 
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNoteOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleUpdateNote} variant="contained">Save Note</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
