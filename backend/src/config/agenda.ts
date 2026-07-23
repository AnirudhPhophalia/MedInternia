import { Agenda } from 'agenda';
import mongoose from 'mongoose';

// Create a new Agenda instance
export const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URI as string,
    collection: 'agendaJobs',
  },
} as any);

// Configure graceful shutdowns for Agenda
let isShuttingDown = false;

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('Shutting down Agenda gracefully...');
  await agenda.stop();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default agenda;
