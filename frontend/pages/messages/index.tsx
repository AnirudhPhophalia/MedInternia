import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Box, Typography, Grid, List, ListItem, ListItemButton, ListItemText, ListItemAvatar,
  Avatar, TextField, Button, Paper, Divider, CircularProgress, Alert
} from '@mui/material';
import api, { getSocketUrl } from '../../utils/api';
import { io, Socket } from 'socket.io-client';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  userType?: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: string;
  updatedAt: string;
}

interface Message {
  _id: string;
  sender: User | string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { userId } = router.query; // If initiated from a profile

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  // New states for cache, typing indicator, and new chat recipient info
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [newChatUser, setNewChatUser] = useState<User | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserRef = useRef<User | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Fetch current user and conversations
    const init = async () => {
      try {
        const userRes = await api.get('/auth/profile');
        setCurrentUser(userRes.data.data.user);

        const convRes = await api.get('/messages/conversations');
        setConversations(convRes.data.data.conversations);
        setLoading(false);

        // Connect socket
        const token = localStorage.getItem('token');
        if (token) {
          const socketUrl = getSocketUrl();
          socketRef.current = io(socketUrl, {
            auth: { token }
          });

          socketRef.current.on('new_message', (data: { message: Message, conversationId: string }) => {
            // Update conversation lastMessage
            setConversations(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(c => c._id === data.conversationId);
              if (idx !== -1) {
                updated[idx].lastMessage = data.message.content;
                updated[idx].updatedAt = new Date().toISOString();
              } else {
                // Fetch conversations list again if it's a new one not in list
                api.get('/messages/conversations').then(res => {
                  setConversations(res.data.data.conversations);
                }).catch(console.error);
              }
              return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });

            // Update messages if conversation is active
            setActiveConversationId(currentActive => {
              if (currentActive === data.conversationId) {
                setMessages(prev => {
                  const updated = [...prev, data.message];
                  setMessagesCache(cache => ({
                    ...cache,
                    [data.conversationId]: updated
                  }));
                  // Call API to mark as read immediately since we are viewing it
                  api.patch(`/messages/${data.conversationId}/read`).catch(console.error);
                  return updated;
                });
              } else {
                // Update messages in cache for background conversation
                setMessagesCache(cache => {
                  if (cache[data.conversationId]) {
                    return {
                      ...cache,
                      [data.conversationId]: [...cache[data.conversationId], data.message]
                    };
                  }
                  return cache;
                });
              }
              return currentActive;
            });
          });

          socketRef.current.on('typing_status', (data: { conversationId: string, senderId: string, isTyping: boolean }) => {
            setActiveConversationId(currentActive => {
              if (currentActive === data.conversationId) {
                setIsOtherUserTyping(data.isTyping);
              }
              return currentActive;
            });
          });

          socketRef.current.on('messages_read', (data: { conversationId: string, readBy: string }) => {
            setActiveConversationId(currentActive => {
              if (currentActive === data.conversationId) {
                setMessages(prev => {
                  const updated = prev.map(m => {
                    const senderId = typeof m.sender === 'string' ? m.sender : m.sender?._id;
                    if (senderId === currentUserRef.current?._id && !m.readAt) {
                      return { ...m, readAt: new Date().toISOString() };
                    }
                    return m;
                  });
                  setMessagesCache(cache => ({
                    ...cache,
                    [data.conversationId]: updated
                  }));
                  return updated;
                });
              }
              return currentActive;
            });
          });
        }
      } catch (err) {
        setLoading(false);
        setError('Failed to load messages');
      }
    };
    init();

    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (userId && currentUser) {
      // We are trying to start a chat with userId
      handleStartChat(userId as string);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (activeConversationId?.startsWith('new-')) {
      const targetUserId = activeConversationId.replace('new-', '');
      api.get(`/users/${targetUserId}/public`)
        .then(res => {
          setNewChatUser(res.data.data.user);
        })
        .catch(err => {
          console.error('Failed to load user info', err);
        });
    } else {
      setNewChatUser(null);
    }
    setIsOtherUserTyping(false);
  }, [activeConversationId]);

  const handleStartChat = async (targetUserId: string) => {
    if (targetUserId === currentUser?._id) return;

    // Check if conversation already exists
    const existing = conversations.find(c => 
      c.participants.some(p => p._id === targetUserId)
    );
    
    if (existing) {
      setActiveConversationId(existing._id);
      fetchMessages(existing._id);
      api.patch(`/messages/${existing._id}/read`).catch(console.error);
    } else {
      // Set a temporary state so we can send the first message
      // Real conversation will be created on first message send
      setActiveConversationId('new-' + targetUserId);
    }
  };

  const fetchMessages = async (convId: string) => {
    if (convId.startsWith('new-')) {
      setMessages([]);
      return;
    }

    // Load from cache first
    if (messagesCache[convId]) {
      setMessages(messagesCache[convId]);
    }

    try {
      const res = await api.get(`/messages/${convId}`);
      const fetchedMessages = res.data.data.messages;
      setMessages(fetchedMessages);
      setMessagesCache(prev => ({
        ...prev,
        [convId]: fetchedMessages
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    fetchMessages(convId);
    api.patch(`/messages/${convId}/read`).catch(console.error);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socketRef.current || !activeConversationId || activeConversationId.startsWith('new-')) return;

    const activeConv = conversations.find(c => c._id === activeConversationId);
    if (!activeConv) return;
    const otherParticipant = activeConv.participants.find(p => p._id !== currentUserRef.current?._id);
    if (!otherParticipant) return;

    if (!typingTimeoutRef.current) {
      socketRef.current.emit('typing', {
        conversationId: activeConversationId,
        receiverId: otherParticipant._id,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', {
        conversationId: activeConversationId,
        receiverId: otherParticipant._id,
        isTyping: false
      });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId) return;

    let targetUserId = '';
    if (activeConversationId.startsWith('new-')) {
      targetUserId = activeConversationId.replace('new-', '');
    } else {
      const activeConv = conversations.find(c => c._id === activeConversationId);
      if (activeConv) {
        const otherParticipant = activeConv.participants.find(p => p._id !== currentUser?._id);
        if (otherParticipant) targetUserId = otherParticipant._id;
      }
    }

    if (!targetUserId) return;

    // Reset typing status on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (socketRef.current && !activeConversationId.startsWith('new-')) {
      socketRef.current.emit('typing', {
        conversationId: activeConversationId,
        receiverId: targetUserId,
        isTyping: false
      });
    }

    try {
      const res = await api.post('/messages', {
        receiverId: targetUserId,
        content: newMessage
      });
      
      setNewMessage('');
      
      const { message, conversationId } = res.data.data;

      if (activeConversationId.startsWith('new-')) {
        // Refresh conversations to get the newly created one
        const convRes = await api.get('/messages/conversations');
        setConversations(convRes.data.data.conversations);
        setActiveConversationId(conversationId);
        setMessages([message]);
        setMessagesCache(prev => ({
          ...prev,
          [conversationId]: [message]
        }));
        
        // Remove userId query param so we don't restart logic
        router.replace('/messages', undefined, { shallow: true });
      } else {
        setMessages(prev => {
          const updated = [...prev, message];
          setMessagesCache(cache => ({
            ...cache,
            [conversationId]: updated
          }));
          return updated;
        });
        // Update conversation list locally
        setConversations(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(c => c._id === conversationId);
          if (idx !== -1) {
            updated[idx].lastMessage = message.content;
            updated[idx].updatedAt = new Date().toISOString();
          }
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  if (loading) return <Container sx={{ py: 4 }}><CircularProgress /></Container>;
  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Messages</Typography>
      
      <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflowY: 'auto', borderRadius: 3, border: '1px solid #e3eafc' }}>
            <List>
              {conversations.length === 0 && !activeConversationId?.startsWith('new-') && (
                <Box p={3} textAlign="center" color="text.secondary">No conversations yet.</Box>
              )}
              {conversations.map(conv => {
                const other = conv.participants.find(p => p._id !== currentUser?._id);
                if (!other) return null;
                const isSelected = activeConversationId === conv._id;
                
                return (
                  <React.Fragment key={conv._id}>
                    <ListItemButton 
                      onClick={() => handleSelectConversation(conv._id)}
                      sx={{ bgcolor: isSelected ? 'action.selected' : 'transparent' }}
                    >
                      <ListItemAvatar>
                        <Avatar src={other.profilePicture || ''} />
                      </ListItemAvatar>
                      <ListItemText 
                        primary={`${other.firstName} ${other.lastName}`} 
                        secondary={conv.lastMessage || 'No messages yet'}
                        primaryTypographyProps={{ fontWeight: isSelected ? 700 : 500 }}
                        secondaryTypographyProps={{ 
                          noWrap: true,
                          sx: { color: isSelected ? 'text.primary' : 'text.secondary' }
                        }}
                      />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid #e3eafc' }}>
            {activeConversationId ? (
              <>
                <Box sx={{ p: 2, borderBottom: '1px solid #e3eafc', bgcolor: '#f8faff', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight={700}>
                    {activeConversationId.startsWith('new-')
                      ? newChatUser ? `${newChatUser.firstName} ${newChatUser.lastName}` : 'New Conversation'
                      : (() => {
                          const activeConv = conversations.find(c => c._id === activeConversationId);
                          const other = activeConv?.participants.find(p => p._id !== currentUser?._id);
                          return other ? `${other.firstName} ${other.lastName}` : 'Conversation';
                        })()}
                  </Typography>
                  {isOtherUserTyping && (
                    <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic', display: 'block' }}>
                      typing...
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {messages.length === 0 && !activeConversationId.startsWith('new-') && (
                    <Box textAlign="center" color="text.secondary" mt={2}>No messages here.</Box>
                  )}
                  {messages.map(msg => {
                    const msgSenderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
                    const isMe = msgSenderId === currentUser?._id;
                    const msgSenderName = typeof msg.sender === 'string' ? '' : msg.sender?.firstName;
                    
                    return (
                      <Box 
                        key={msg._id} 
                        sx={{ 
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          mb: 2 
                        }}
                      >
                        {!isMe && msgSenderName && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            {msgSenderName}
                          </Typography>
                        )}
                        <Paper 
                          sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            bgcolor: isMe ? 'primary.main' : 'grey.100',
                            color: isMe ? 'primary.contrastText' : 'text.primary',
                            position: 'relative'
                          }}
                        >
                          <Typography variant="body1" sx={{ pr: isMe ? 4 : 0 }}>{msg.content}</Typography>
                          {isMe && (
                            <Box sx={{ position: 'absolute', right: 6, bottom: 2, display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                              {msg.readAt ? (
                                <DoneAllIcon sx={{ fontSize: 14, color: 'inherit' }} titleAccess="Read" />
                              ) : (
                                <DoneIcon sx={{ fontSize: 14, color: 'inherit' }} titleAccess="Sent" />
                              )}
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>
                
                <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid #e3eafc' }}>
                  <Grid container spacing={1}>
                    <Grid size="grow">
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </Grid>
                    <Grid>
                      <Button type="submit" variant="contained" disabled={!newMessage.trim()}>
                        Send
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                Select a conversation to start messaging
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
