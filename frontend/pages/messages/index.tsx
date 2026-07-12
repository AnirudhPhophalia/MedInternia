import React, { useState } from 'react';
import {
  Box, Typography, Paper, IconButton, TextField, Avatar,
  List, ListItem, ListItemButton, ListItemAvatar, ListItemText, Divider,
  Tooltip, Badge, Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import KeyIcon from '@mui/icons-material/Key';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import Navbar from '../../components/Navbar';

export default function Messages() {
  const [activeChat, setActiveChat] = useState(1);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      sender: 'Emily',
      text: 'Hi! Are you free to discuss the neo-adjuvant case off the record?',
      time: '10:45 AM',
      me: false,
    },
    {
      id: 2,
      sender: 'You',
      text: 'Yes, absolutely. Since this chat is E2E encrypted, we can discuss the specifics.',
      time: '10:47 AM',
      me: true,
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setChatHistory([...chatHistory, {
      id: Date.now(),
      sender: 'You',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      me: true
    }]);
    setMessage('');
  };

  const contacts = [
    { id: 1, name: 'Dr. Emily Carter', role: 'Surgery', unread: 2, online: true },
    { id: 2, name: 'Dr. Michael Chen', role: 'Radiology', unread: 0, online: false },
    { id: 3, name: 'Dr. Sarah Jenkins', role: 'Oncology', unread: 0, online: true },
  ];

  return (
    <>
    <Navbar />
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', bgcolor: '#f1f5f9', color: '#0f172a' }}>
      
      {/* Sidebar: Contacts List */}
      <Box sx={{ width: 320, bgcolor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Secure Messages</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search contacts..."
            InputProps={{ startAdornment: <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
          />
        </Box>
        <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
          {contacts.map((contact) => (
            <React.Fragment key={contact.id}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={activeChat === contact.id}
                  onClick={() => setActiveChat(contact.id)}
                  sx={{
                    bgcolor: activeChat === contact.id ? '#eff6ff' : 'transparent',
                    '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }
                  }}
                >
                  <ListItemAvatar>
                  <Badge color="success" variant="dot" invisible={!contact.online} overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                    <Avatar sx={{ bgcolor: activeChat === contact.id ? 'primary.main' : 'grey.400' }}>
                      {contact.name.charAt(4)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={activeChat === contact.id ? 700 : 500}>
                        {contact.name}
                      </Typography>
                      {contact.unread > 0 && (
                        <Chip label={contact.unread} color="primary" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LockIcon sx={{ fontSize: 12, color: 'success.main' }} />
                      <Typography variant="caption" color="text.secondary">Encrypted</Typography>
                    </Box>
                  }
                />
                </ListItemButton>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Chat Header */}
        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>E</Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Dr. Emily Carter
                <Tooltip title="Verified Professional">
                  <VerifiedUserIcon color="primary" fontSize="small" />
                </Tooltip>
              </Typography>
              <Typography variant="caption" color="text.secondary">Surgery • Last seen recently</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<LockIcon sx={{ fontSize: 16 }} />}
              label="End-to-End Encrypted"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, borderRadius: 2 }}
            />
            <IconButton><MoreVertIcon /></IconButton>
          </Box>
        </Box>

        {/* Chat Messages */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Paper elevation={0} sx={{ display: 'inline-block', p: 1.5, bgcolor: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <KeyIcon fontSize="small" color="action" />
                Messages are end-to-end encrypted. No one outside of this chat, not even MedInternia, can read or listen to them.
              </Typography>
            </Paper>
          </Box>

          {chatHistory.map((msg) => (
            msg.me ? (
              <Box key={msg.id} sx={{ display: 'flex', gap: 2, maxWidth: '75%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Paper sx={{ p: 1.5, bgcolor: 'primary.main', color: 'white', borderRadius: '16px 0 16px 16px' }}>
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, mr: 1 }}>
                    <Typography variant="caption" color="text.disabled">{msg.time}</Typography>
                    <LockIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box key={msg.id} sx={{ display: 'flex', gap: 2, maxWidth: '75%' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '14px' }}>E</Avatar>
                <Box>
                  <Paper sx={{ p: 1.5, bgcolor: 'white', color: '#0f172a', borderRadius: '0 16px 16px 16px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, ml: 1, display: 'block' }}>{msg.time}</Typography>
                </Box>
              </Box>
            )
          ))}

        </Box>

        {/* Chat Input */}
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
          <TextField
            fullWidth
            placeholder="Type an encrypted message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleSendMessage} color="primary" sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}>
                  <SendIcon />
                </IconButton>
              ),
              startAdornment: (
                <LockIcon color="disabled" sx={{ mr: 1 }} />
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                bgcolor: '#f8fafc'
              }
            }}
          />
        </Box>

      </Box>
    </Box>
    </>
  );
}
