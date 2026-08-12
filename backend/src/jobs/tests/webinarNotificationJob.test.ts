import { Agenda } from "agenda";
import Webinar from "../../models/Webinar";
import User from "../../models/User";
import Notification from "../../models/Notification";
import {
  SEND_WEBINAR_NOTIFICATIONS_JOB,
  processWebinarNotifications,
  registerWebinarNotificationJob,
  enqueueWebinarNotification,
} from "../webinarNotificationJob";

jest.mock("../../models/Webinar");
jest.mock("../../models/User");
jest.mock("../../models/Notification");
jest.mock("../../config/agenda", () => {
  const mockJob = {
    unique: jest.fn().mockReturnThis(),
    schedule: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const mockAgenda = {
    define: jest.fn(),
    create: jest.fn().mockReturnValue(mockJob),
  };
  return {
    createAgenda: jest.fn().mockReturnValue(mockAgenda),
  };
});

const mockedWebinar = Webinar as jest.Mocked<typeof Webinar>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedNotification = Notification as jest.Mocked<typeof Notification>;

describe("webinar notification job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processWebinarNotifications", () => {
    it("returns early if webinar is not found", async () => {
      mockedWebinar.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      await processWebinarNotifications("non-existent-id");

      expect(mockedUser.find).not.toHaveBeenCalled();
      expect(mockedNotification.insertMany).not.toHaveBeenCalled();
    });

    it("returns early if webinar host is missing", async () => {
      mockedWebinar.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "webinar-1",
          host: null,
        }),
      } as any);

      await processWebinarNotifications("webinar-1");

      expect(mockedUser.find).not.toHaveBeenCalled();
      expect(mockedNotification.insertMany).not.toHaveBeenCalled();
    });

    it("sends notifications to all interns in batches", async () => {
      const webinarMock = {
        _id: "webinar-100",
        title: "Advanced Cardiology",
        host: {
          firstName: "John",
          lastName: "Doe",
        },
      };

      mockedWebinar.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(webinarMock),
      } as any);

      const mockInterns = [
        { _id: "intern-1" },
        { _id: "intern-2" },
      ];

      const eachAsyncMock = jest.fn().mockImplementation(async (callback) => {
        for (const intern of mockInterns) {
          await callback(intern);
        }
      });

      const cursorMock = {
        eachAsync: eachAsyncMock,
      };

      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(cursorMock),
      } as any);

      mockedNotification.insertMany.mockResolvedValue([] as any);

      await processWebinarNotifications("webinar-100");

      expect(mockedUser.find).toHaveBeenCalledWith({ userType: "intern" });
      expect(mockedNotification.insertMany).toHaveBeenCalledWith([
        {
          recipient: "intern-1",
          message: "New webinar scheduled: Advanced Cardiology by John Doe",
          type: "webinar",
          link: "/webinars/webinar-100",
        },
        {
          recipient: "intern-2",
          message: "New webinar scheduled: Advanced Cardiology by John Doe",
          type: "webinar",
          link: "/webinars/webinar-100",
        },
      ]);
    });
  });

  describe("registerWebinarNotificationJob", () => {
    it("registers send-webinar-notifications job with agenda scheduler", () => {
      const scheduler = {
        define: jest.fn(),
      } as unknown as Agenda;

      registerWebinarNotificationJob(scheduler);

      expect(scheduler.define).toHaveBeenCalledWith(
        SEND_WEBINAR_NOTIFICATIONS_JOB,
        expect.objectContaining({
          concurrency: 5,
          lockLifetime: 120_000,
        }),
        expect.any(Function)
      );
    });
  });

  describe("enqueueWebinarNotification", () => {
    it("creates and schedules an Agenda job for the webinar", async () => {
      const { createAgenda } = require("../../config/agenda");
      const mockAgenda = createAgenda();

      await enqueueWebinarNotification("webinar-200");

      expect(mockAgenda.create).toHaveBeenCalledWith(
        SEND_WEBINAR_NOTIFICATIONS_JOB,
        { webinarId: "webinar-200" }
      );
      const mockJob = mockAgenda.create.mock.results[0].value;
      expect(mockJob.unique).toHaveBeenCalledWith({
        name: SEND_WEBINAR_NOTIFICATIONS_JOB,
        "data.webinarId": "webinar-200",
      });
      expect(mockJob.schedule).toHaveBeenCalled();
      expect(mockJob.save).toHaveBeenCalled();
    });
  });
});
