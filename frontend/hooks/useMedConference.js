import { useState, useEffect, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';

export const useMedConference = () => {
  const [callObject, setCallObject] = useState(null);
  const [participants, setParticipants] = useState({});
  const [networkQuality, setNetworkQuality] = useState('good');
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  const updateParticipants = useCallback((call) => {
    if (!call) return;
    setParticipants(call.participants());
  }, []);

  const joinRoom = useCallback(async (url, token) => {
    try {
      const newCallObject = DailyIframe.createCallObject();
      setCallObject(newCallObject);

      await newCallObject.join({ url, token });
      setIsJoined(true);
      updateParticipants(newCallObject);
    } catch (err) {
      setError(err.message || 'Failed to join room');
    }
  }, [updateParticipants]);

  useEffect(() => {
    if (!callObject) return;

    const handleJoinedMeeting = () => {
      updateParticipants(callObject);
    };

    const handleParticipantEvent = () => {
      updateParticipants(callObject);
    };

    const handleLeftMeeting = () => {
      setIsJoined(false);
      setParticipants({});
    };

    const handleError = (event) => {
      setError(event.errorMsg || 'An error occurred');
    };

    const handleNetworkQualityChange = (event) => {
      const { threshold } = event;
      setNetworkQuality(threshold);
      
      if (threshold === 'poor' || threshold === 'very-poor') {
        callObject.updateReceiveSettings({ video: false });
      } else if (threshold === 'good') {
        callObject.updateReceiveSettings({ video: true });
      }
    };

    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('participant-joined', handleParticipantEvent);
    callObject.on('participant-updated', handleParticipantEvent);
    callObject.on('participant-left', handleParticipantEvent);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);
    callObject.on('network-quality-change', handleNetworkQualityChange);

    return () => {
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('participant-joined', handleParticipantEvent);
      callObject.off('participant-updated', handleParticipantEvent);
      callObject.off('participant-left', handleParticipantEvent);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
      callObject.off('network-quality-change', handleNetworkQualityChange);
    };
  }, [callObject, updateParticipants]);

  const leaveRoom = useCallback(async () => {
    if (callObject) {
      await callObject.leave();
      callObject.destroy();
      setCallObject(null);
      setIsJoined(false);
      setParticipants({});
    }
  }, [callObject]);

  const muteParticipant = useCallback((participantId) => {
    if (callObject) {
      callObject.updateParticipant(participantId, { setAudio: false });
    }
  }, [callObject]);

  return {
    callObject,
    participants,
    networkQuality,
    isJoined,
    error,
    joinRoom,
    leaveRoom,
    muteParticipant
  };
};
