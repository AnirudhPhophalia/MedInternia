import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import api from '../utils/api';

interface Collection {
  _id: string;
  name: string;
  cases: string[];
}

interface AddToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
}

export default function AddToCollectionModal({ open, onClose, caseId }: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    if (open) {
      fetchCollections();
      setError('');
      setSuccess('');
      setIsCreating(false);
      setNewCollectionName('');
    }
  }, [open]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/collections/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch collections.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      await api.post(`/collections/${collectionId}/cases`, { caseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Case added to collection!');
      
      // Update local state to reflect it's added
      setCollections(prev => prev.map(c => 
        c._id === collectionId ? { ...c, cases: [...c.cases, caseId] } : c
      ));

      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add case to collection.');
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      setError('');
      const token = localStorage.getItem('token');
      
      // 1. Create collection
      const createRes = await api.post('/collections', { name: newCollectionName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newCollection = createRes.data.data;
      
      // 2. Add case to new collection
      await api.post(`/collections/${newCollection._id}/cases`, { caseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Case added to new collection "${newCollectionName}"!`);
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create collection.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Save to Collection</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Select a collection
            </Typography>
            
            {collections.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
                You don't have any collections yet.
              </Typography>
            ) : (
              <List sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0, overflow: 'hidden' }}>
                {collections.map((collection, idx) => {
                  const isAlreadyAdded = collection.cases.includes(caseId);
                  return (
                    <React.Fragment key={collection._id}>
                      <ListItem disablePadding>
                        <ListItemButton 
                          onClick={() => !isAlreadyAdded && handleAddToCollection(collection._id)}
                          disabled={isAlreadyAdded}
                        >
                          <FolderIcon sx={{ color: '#1976d2', mr: 2 }} />
                          <ListItemText 
                            primary={collection.name} 
                            secondary={`${collection.cases.length} saved cases`}
                          />
                          {isAlreadyAdded && (
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              Already Saved
                            </Typography>
                          )}
                        </ListItemButton>
                      </ListItem>
                      {idx < collections.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}

            <Box sx={{ mt: 3 }}>
              {isCreating ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    fullWidth
                    size="small"
                    placeholder="Collection Name (e.g. Interesting Cardiology)"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    autoFocus
                  />
                  <Button 
                    variant="contained" 
                    disableElevation
                    onClick={handleCreateAndAdd}
                    disabled={!newCollectionName.trim()}
                  >
                    Create & Save
                  </Button>
                </Box>
              ) : (
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={() => setIsCreating(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Create new collection
                </Button>
              )}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
