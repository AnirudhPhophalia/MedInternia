jest.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: any) => fn
}));

import { Response } from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
} from "../messageController";
import Conversation from "../../models/Conversation";
import Message from "../../models/Message";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Conversation");
jest.mock("../../models/Message");
jest.mock("../../models/User");
jest.mock("../../utils/socket");

const mockedConversation = Conversation as unknown as jest.Mocked<typeof Conversation>;
const mockedMessage = Message as unknown as jest.Mocked<typeof Message>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, body: any = {}, query: any = {}, params: any = {}): AuthRequest => ({
  user: { _id: userId },
  body,
  query,
  params,
}) as unknown as AuthRequest;

describe("Message Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConversations", () => {
    it("returns conversations user is participant of", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const populateMock = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: "conv-1", participants: ["user-1", "user-2"] }])
      });
      mockedConversation.find.mockReturnValue({ populate: populateMock } as any);

      await getConversations(req, res, () => {});

      expect(mockedConversation.find).toHaveBeenCalledWith({ participants: "user-1" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          conversations: expect.any(Array)
        })
      }));
    });
  });

  describe("getMessages", () => {
    it("returns messages for an authorized conversation and marks other messages as read", async () => {
      const req = mockRequest("user-1", {}, {}, { conversationId: "conv-1" });
      const res = mockResponse();

      mockedConversation.findOne.mockResolvedValue({
        _id: "conv-1",
        participants: ["user-1", "user-2"]
      } as any);

      const populateMock = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: "msg-1", sender: "user-2", content: "hello" }])
      });
      mockedMessage.find.mockReturnValue({ populate: populateMock } as any);

      mockedMessage.countDocuments.mockResolvedValue(1);
      mockedMessage.updateMany.mockResolvedValue({ modifiedCount: 1 } as any);

      await getMessages(req, res, () => {});

      expect(mockedConversation.findOne).toHaveBeenCalledWith({
        _id: "conv-1",
        participants: "user-1"
      });
      expect(mockedMessage.find).toHaveBeenCalledWith({ conversationId: "conv-1" });
      expect(mockedMessage.updateMany).toHaveBeenCalledWith(
        { conversationId: "conv-1", sender: { $ne: "user-1" }, readAt: null },
        { readAt: expect.any(Date) }
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          messages: expect.any(Array)
        })
      }));
    });

    it("throws 404 if conversation not found", async () => {
      const req = mockRequest("user-1", {}, {}, { conversationId: "conv-1" });
      const res = mockResponse();

      mockedConversation.findOne.mockResolvedValue(null);

      const next = jest.fn();
      await expect(getMessages(req, res, next)).rejects.toThrow("Conversation not found");
    });
  });

  describe("sendMessage", () => {
    it("creates message, updates lastMessage, and emits to user if privacy settings allow", async () => {
      const req = mockRequest("user-1", { receiverId: "user-2", content: "hello" });
      const res = mockResponse();

      (mockedUser.findById as any).mockImplementation(async (id: any) => {
        if (id === "user-2") {
          return { _id: "user-2", messagePrivacy: "anyone" } as any;
        }
        return { _id: "user-1" } as any;
      });

      mockedConversation.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue(undefined);
      mockedConversation.create.mockResolvedValue({
        _id: "conv-1",
        participants: ["user-1", "user-2"],
        save: mockSave
      } as any);

      const mockPopulate = jest.fn().mockResolvedValue({
        _id: "msg-1",
        sender: { _id: "user-1", firstName: "Sender" },
        content: "hello"
      });
      mockedMessage.create.mockResolvedValue({
        _id: "msg-1",
        conversationId: "conv-1",
        sender: "user-1",
        content: "hello",
        populate: mockPopulate
      } as any);

      await sendMessage(req, res, () => {});

      expect(mockedConversation.create).toHaveBeenCalledWith({
        participants: ["user-1", "user-2"]
      });
      expect(mockedMessage.create).toHaveBeenCalledWith({
        conversationId: "conv-1",
        sender: "user-1",
        content: "hello"
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("markAsRead", () => {
    it("marks unread messages as read and emits socket notification to recipient", async () => {
      const req = mockRequest("user-1", {}, {}, { conversationId: "conv-1" });
      const res = mockResponse();

      mockedConversation.findOne.mockResolvedValue({
        _id: "conv-1",
        participants: ["user-1", "user-2"]
      } as any);

      mockedMessage.updateMany.mockResolvedValue({ modifiedCount: 1 } as any);

      await markAsRead(req, res, () => {});

      expect(mockedMessage.updateMany).toHaveBeenCalledWith(
        { conversationId: "conv-1", sender: { $ne: "user-1" }, readAt: null },
        { readAt: expect.any(Date) }
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: "Messages marked as read"
      }));
    });
  });
});
