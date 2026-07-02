import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HealingIcon from '@mui/icons-material/Healing';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PushPinIcon from '@mui/icons-material/PushPin';
import { motion } from 'framer-motion';

interface ClinicalTimelineProps {
  caseData: any;
  discussions: any[];
}

interface TimelineEvent {
  id: string;
  type: 'presentation' | 'diagnosis' | 'treatment' | 'followup' | 'discussion';
  title: string;
  date: Date;
  content: string;
  meta?: any;
}

const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({ caseData, discussions }) => {
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({});

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build events
  const events: TimelineEvent[] = [];

  // 1. Initial Presentation
  events.push({
    id: 'presentation',
    type: 'presentation',
    title: 'Initial Case Presentation',
    date: new Date(caseData.createdAt),
    content: caseData.description,
    meta: {
      symptoms: caseData.symptoms || [],
      patientInfo: caseData.patientInfo || {}
    }
  });

  // 2. Diagnosis (if exists)
  if (caseData.diagnosis) {
    events.push({
      id: 'diagnosis',
      type: 'diagnosis',
      title: 'Diagnostic Confirmation',
      date: new Date(new Date(caseData.createdAt).getTime() + 1000), // Offset slightly
      content: caseData.diagnosis,
      meta: { specialization: caseData.specialization }
    });
  }

  // 3. Treatment (if exists)
  if (caseData.treatment) {
    events.push({
      id: 'treatment',
      type: 'treatment',
      title: 'Treatment Protocol Initiated',
      date: new Date(new Date(caseData.createdAt).getTime() + 2000), // Offset slightly
      content: caseData.treatment
    });
  }

  // 4. Follow-up updates
  if (caseData.followUps && Array.isArray(caseData.followUps)) {
    caseData.followUps.forEach((f: any, idx: number) => {
      events.push({
        id: `followup-${f._id || idx}`,
        type: 'followup',
        title: 'Clinical Follow-up Update',
        date: new Date(f.createdAt),
        content: f.content,
        meta: {
          outcome: f.outcome,
          images: f.images || [],
          author: f.author
        }
      });
    });
  }

  // 5. Pinned / High-value Discussions
  const pinnedComments = discussions.filter(c => c.pinned);
  pinnedComments.forEach((c: any, idx: number) => {
    events.push({
      id: `discussion-${c._id || idx}`,
      type: 'discussion',
      title: `Consensus Milestone by ${c.author?.firstName || 'Doctor'}`,
      date: new Date(c.createdAt),
      content: c.content,
      meta: { author: c.author }
    });
  });

  // Sort events chronologically (ascending)
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Colors & Icons configuration
  const eventConfig = {
    presentation: {
      color: '#1976d2',
      bgColor: '#e3f2fd',
      icon: <MedicalServicesIcon style={{ color: '#1976d2' }} />
    },
    diagnosis: {
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      icon: <LocalHospitalIcon style={{ color: '#9c27b0' }} />
    },
    treatment: {
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      icon: <HealingIcon style={{ color: '#2e7d32' }} />
    },
    followup: {
      color: '#ed6c02',
      bgColor: '#fff3e0',
      icon: <EventNoteIcon style={{ color: '#ed6c02' }} />
    },
    discussion: {
      color: '#ff9800',
      bgColor: '#fff8e1',
      icon: <PushPinIcon style={{ color: '#ff9800' }} />
    }
  };

  return (
    <Box sx={{ position: 'relative', py: 2, pl: { xs: 2, sm: 4 }, pr: 1 }}>
      {/* Central dashed line */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: { xs: 26, sm: 42 },
        width: '2px',
        borderLeft: '2px dashed #cfd8dc',
        zIndex: 0
      }} />

      <Stack spacing={4}>
        {events.map((event, idx) => {
          const config = eventConfig[event.type];
          const isExpanded = !!expandedEvents[event.id];

          return (
            <Box key={event.id} sx={{ display: 'flex', position: 'relative', zIndex: 1 }} role="listitem">
              {/* Event Badge / Icon */}
              <Avatar sx={{
                width: { xs: 36, sm: 48 },
                height: { xs: 36, sm: 48 },
                bgcolor: config.bgColor,
                border: `2px solid ${config.color}`,
                position: 'absolute',
                left: { xs: -18, sm: -24 },
                top: 8,
                zIndex: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }} aria-hidden="true">
                {config.icon}
              </Avatar>

              {/* Event Card */}
              <Card sx={{
                ml: { xs: 3, sm: 5 },
                width: '100%',
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e3eafc',
                borderLeft: `5px solid ${config.color}`,
                transition: 'all 0.3s'
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#333', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {event.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Chip 
                      label={event.type.toUpperCase()} 
                      size="small" 
                      sx={{ 
                        bgcolor: config.bgColor, 
                        color: config.color, 
                        fontWeight: 700,
                        fontSize: '0.75rem' 
                      }} 
                    />
                  </Stack>

                  {/* Patient Quick Info (Presentation-only) */}
                  {event.type === 'presentation' && event.meta?.patientInfo && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                      <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap">
                        {event.meta.patientInfo.age && (
                          <Typography variant="body2"><strong>Age:</strong> {event.meta.patientInfo.age}</Typography>
                        )}
                        {event.meta.patientInfo.gender && (
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}><strong>Gender:</strong> {event.meta.patientInfo.gender}</Typography>
                        )}
                      </Stack>
                      {event.meta.symptoms && event.meta.symptoms.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span"><strong>Symptoms:</strong> </Typography>
                          {event.meta.symptoms.map((s: string) => (
                            <Chip key={s} label={s} size="small" sx={{ mr: 0.5, mb: 0.5, bgcolor: '#e2e8f0' }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Content (Description / notes) */}
                  <Typography variant="body1" sx={{ 
                    color: '#444', 
                    lineHeight: 1.6,
                    fontSize: '0.95rem',
                    whiteSpace: 'pre-line',
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'none' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {event.content}
                  </Typography>

                  {/* Followup-specific outcome */}
                  {event.type === 'followup' && event.meta?.outcome && isExpanded && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#fef3c7', borderRadius: 3, border: '1px solid #fde68a' }}>
                      <Typography variant="subtitle2" fontWeight={700} color="#b45309" sx={{ mb: 0.5 }}>Outcome / Patient Response</Typography>
                      <Typography variant="body2" color="#78350f">{event.meta.outcome}</Typography>
                    </Box>
                  )}

                  {/* Expand / Collapse trigger */}
                  <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                    <Button 
                      size="small" 
                      onClick={() => toggleExpand(event.id)}
                      endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ textTransform: 'none', fontWeight: 600, color: config.color }}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${event.title}`}
                    >
                      {isExpanded ? 'Show Less' : 'Read Full Details'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ClinicalTimeline;
