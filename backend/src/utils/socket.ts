import { Server } from 'socket.io';

let io: Server;

export const setSocketIO = (socketServer: Server): void => {
  io = socketServer;
};

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call setSocketIO first.');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  if (!io) return; // Silently skip if socket not ready
  io.to(`user:${userId}`).emit(event, data);
};

export const sanitizeWebinarForSocket = (webinar: any): any => {
  if (!webinar) return webinar;

  let raw: any;
  if (typeof webinar.toObject === 'function') {
    raw = webinar.toObject({ getters: true, virtuals: true });
  } else if (typeof webinar === 'object') {
    raw = JSON.parse(JSON.stringify(webinar, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }));
  } else {
    return webinar;
  }

  const participantCount = Array.isArray(raw.participants)
    ? raw.participants.length
    : (raw.participantCount || 0);

  const polls = Array.isArray(raw.polls)
    ? raw.polls.map((poll: any) => {
        const options = Array.isArray(poll.options) ? poll.options : [];
        const voteCounts = options.map(() => 0);
        let totalVotes = 0;

        if (poll.votes) {
          if (poll.votes instanceof Map) {
            poll.votes.forEach((optIdx: number) => {
              if (typeof optIdx === 'number' && optIdx >= 0 && optIdx < voteCounts.length) {
                voteCounts[optIdx]++;
                totalVotes++;
              }
            });
          } else if (typeof poll.votes === 'object') {
            Object.values(poll.votes).forEach((optIdx: any) => {
              const idx = Number(optIdx);
              if (!isNaN(idx) && idx >= 0 && idx < voteCounts.length) {
                voteCounts[idx]++;
                totalVotes++;
              }
            });
          }
        }

        const { votes, ...pollRest } = poll;
        return {
          ...pollRest,
          voteCounts,
          totalVotes
        };
      })
    : [];

  const {
    __v,
    $__,
    $isDefault,
    _doc,
    participants,
    meetingLink,
    ...sanitized
  } = raw;

  return {
    ...sanitized,
    participantCount,
    polls
  };
};