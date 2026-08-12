import { Agenda, Job } from "agenda";
import { createAgenda } from "../config/agenda";
import Webinar from "../models/Webinar";
import User from "../models/User";
import Notification from "../models/Notification";

export const SEND_WEBINAR_NOTIFICATIONS_JOB = "send-webinar-notifications";

export interface WebinarNotificationJobData {
  webinarId: string;
}

const registeredSchedulers = new WeakSet<Agenda>();
let agenda: Agenda | undefined;

const getAgenda = (): Agenda => {
  agenda ??= createAgenda();
  return agenda;
};

export async function processWebinarNotifications(webinarId: string): Promise<void> {
  const webinar = await Webinar.findById(webinarId).populate(
    "host",
    "firstName lastName"
  );

  if (!webinar || !webinar.host) {
    return;
  }

  const host = webinar.host as any;
  const batchSize = 500;

  const cursor = User.find({ userType: "intern" })
    .select("_id")
    .lean()
    .cursor({ batchSize });

  const batch: Array<{
    recipient: any;
    message: string;
    type: string;
    link?: string;
  }> = [];

  await cursor.eachAsync(async (intern: any) => {
    batch.push({
      recipient: intern._id,
      message: `New webinar scheduled: ${webinar.title} by ${host.firstName} ${host.lastName}`,
      type: "webinar",
      link: `/webinars/${webinar._id}`,
    });

    if (batch.length >= batchSize) {
      await Notification.insertMany(batch);
      batch.length = 0;
    }
  });

  if (batch.length > 0) {
    await Notification.insertMany(batch);
  }
}

export function registerWebinarNotificationJob(
  scheduler: Agenda = getAgenda()
): void {
  if (registeredSchedulers.has(scheduler)) return;
  registeredSchedulers.add(scheduler);

  scheduler.define<WebinarNotificationJobData>(
    SEND_WEBINAR_NOTIFICATIONS_JOB,
    {
      concurrency: 5,
      lockLifetime: 120_000,
    },
    async (job: Job<WebinarNotificationJobData>) => {
      await processWebinarNotifications(job.attrs.data.webinarId);
    }
  );
}

export async function enqueueWebinarNotification(
  webinarId: string
): Promise<void> {
  const job = getAgenda()
    .create<WebinarNotificationJobData>(SEND_WEBINAR_NOTIFICATIONS_JOB, {
      webinarId,
    })
    .unique({ name: SEND_WEBINAR_NOTIFICATIONS_JOB, "data.webinarId": webinarId })
    .schedule(new Date());

  await job.save();
}
