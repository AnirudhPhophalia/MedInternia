import React, { useEffect, useRef } from 'react';
import { useMedConference } from '../hooks/useMedConference';

const ParticipantMedia = ({ participant }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (participant.videoTrack && videoRef.current) {
      videoRef.current.srcObject = new MediaStream([participant.videoTrack]);
    }
    if (participant.audioTrack && audioRef.current && !participant.local) {
      audioRef.current.srcObject = new MediaStream([participant.audioTrack]);
    }
  }, [participant.videoTrack, participant.audioTrack, participant.local]);

  return (
    <div style={{ position: 'relative', margin: '10px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '320px', height: '240px', objectFit: 'cover' }}
      />
      <audio ref={audioRef} autoPlay />
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        left: '10px', 
        color: '#fff', 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        padding: '4px 8px', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        {participant.user_name || 'Guest'} {participant.local ? '(You)' : ''}
      </div>
    </div>
  );
};

export const WebinarRoom = ({ url, token, isHost = false }) => {
  const {
    participants,
    networkQuality,
    isJoined,
    error,
    joinRoom,
    leaveRoom,
    muteParticipant
  } = useMedConference();

  useEffect(() => {
    if (url) {
      joinRoom(url, token);
    }
    return () => {
      leaveRoom();
    };
  }, [url, token, joinRoom, leaveRoom]);

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#f44336', fontFamily: 'sans-serif' }}>
        <h3>Error Joining Webinar: {error}</h3>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', fontFamily: 'sans-serif' }}>
        <h3>Joining Secure Medical Webinar...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>Live AMA - MedInternia</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ 
            padding: '6px 12px', 
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: networkQuality === 'poor' ? '#ff9800' : networkQuality === 'very-poor' ? '#f44336' : '#e8f5e9',
            color: networkQuality === 'good' ? '#2e7d32' : '#fff'
          }}>
            Network: {networkQuality.toUpperCase()}
          </span>
          <button 
            onClick={leaveRoom}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#d32f2f', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Leave Webinar
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {Object.values(participants).map((p) => (
          <div key={p.session_id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <ParticipantMedia participant={p} />
            {isHost && !p.local && (
              <button 
                onClick={() => muteParticipant(p.session_id)}
                style={{ 
                  margin: '8px 10px', 
                  padding: '8px', 
                  backgroundColor: '#1976d2', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Mute Intern
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
