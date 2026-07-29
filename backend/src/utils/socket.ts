import { Server } from 'socket.io';
import type { SanitizedWebinar } from '../controllers/webinarController';

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

export const emitSanitizedWebinar = (userId: string, event: string, webinar: any, sanitize: (w: any) => SanitizedWebinar): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, sanitize(webinar));
};