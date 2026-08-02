import Agenda from "agenda";

export const createAgenda = (): Agenda => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";

  const agenda = new Agenda({
    db: {
      address: mongoUri,
      collection: "background_jobs",
    },
    processEvery: process.env.AGENDA_PROCESS_EVERY || "5 seconds",
    maxConcurrency: 5,
  });

  agenda.on("error", (error) => {
    console.error("Background job scheduler error:", error);
  });

  return agenda;
};
