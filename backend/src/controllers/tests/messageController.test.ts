import { Response } from "express";
import { getConversations, getMessages, sendMessage } from "../messageController";
import Conversation from "../../models/Conversation";
import Message from "../../models/Message";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";
import { emitToUser } from "../../utils/socket";
import { AppError } from "../../utils/AppError";

jest.mock("../../models/Conversation");
jest.mock("../../models/Message");
jest.mock("../../models/User");
jest.mock("../../utils/socket");

const mockedConversation = Conversation as unknown as jest.Mocked<typeof Conversation>;
const mockedMessage = Message as unknown as jest.Mocked<typeof Message>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedEmitToUser = emitToUser as jest.Mock;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, body: any = {}, params: any = {}): AuthRequest => ({
  user: { _id: userId },
  body,
  params,
}) as unknown as AuthRequest;

const flushPromises = () => new Promise(process.nextTick);

describe("Message Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConversations", () => {
    it("fetches conversations scoped to the logged-in user", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const populateMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockResolvedValue([{ _id: "conv-1" }]);
      
      mockedConversation.find.mockReturnValue({
        populate: populateMock,
        sort: sortMock
      } as any);

      const next = jest.fn();
      getConversations(req as any, res as any, next);
      await flushPromises();

      expect(mockedConversation.find).toHaveBeenCalledWith({ participants: "user-1" });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { conversations: [{ _id: "conv-1" }] } });
    });
  });

  describe("getMessages", () => {
    it("returns 404 if conversation not found or user is not a participant", async () => {
      const req = mockRequest("user-1", {}, { conversationId: "conv-1" });
      const res = mockResponse();

      mockedConversation.findOne.mockResolvedValue(null);

      const next = jest.fn();
      getMessages(req as any, res as any, next);
      await flushPromises();
      
      expect(next).toHaveBeenCalledWith(new AppError("Conversation not found", 404));
      
      expect(mockedConversation.findOne).toHaveBeenCalledWith({
        _id: "conv-1",
        participants: "user-1"
      });
    });

    it("fetches messages and marks unread messages as read", async () => {
      const req = mockRequest("user-1", {}, { conversationId: "conv-1" });
      const res = mockResponse();

      mockedConversation.findOne.mockResolvedValue({ _id: "conv-1" } as any);
      
      const populateMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockResolvedValue([{ _id: "msg-1" }]);
      mockedMessage.find.mockReturnValue({
        populate: populateMock,
        sort: sortMock
      } as any);

      mockedMessage.updateMany.mockResolvedValue({} as any);

      const next = jest.fn();
      getMessages(req as any, res as any, next);
      await flushPromises();

      expect(mockedMessage.updateMany).toHaveBeenCalledWith(
        { conversationId: "conv-1", sender: { $ne: "user-1" }, readAt: null },
        { readAt: expect.any(Date) }
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { messages: [{ _id: "msg-1" }] } });
    });
  });

  describe("sendMessage", () => {
    it("rejects self-messaging", async () => {
      const req = mockRequest("user-1", { receiverId: "user-1", content: "hello" });
      const res = mockResponse();

      const next = jest.fn();
      sendMessage(req as any, res as any, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(new AppError("You cannot message yourself", 400));
    });

    it("enforces messagePrivacy: 'none'", async () => {
      const req = mockRequest("user-1", { receiverId: "user-2", content: "hello" });
      const res = mockResponse();

      const next = jest.fn();
      mockedUser.findById.mockImplementation(((id: string) => {
        if (id === "user-2") return Promise.resolve({ _id: "user-2", messagePrivacy: "none" } as any);
        return Promise.resolve({ _id: "user-1" } as any);
      }) as any);

      sendMessage(req as any, res as any, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(new AppError("This user is not accepting direct messages", 403));
    });

    it("enforces messagePrivacy: 'verified_only'", async () => {
      const req = mockRequest("user-1", { receiverId: "user-2", content: "hello" });
      const res = mockResponse();

      const next = jest.fn();
      mockedUser.findById.mockImplementation(((id: string) => {
        if (id === "user-2") return Promise.resolve({ _id: "user-2", messagePrivacy: "verified_only" } as any);
        if (id === "user-1") return Promise.resolve({ _id: "user-1", isVerified: false, isVerifiedDoctor: false } as any);
        return Promise.resolve(null);
      }) as any);

      sendMessage(req as any, res as any, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(new AppError("This user only accepts messages from verified users", 403));
    });

    it("reuses existing conversation, creates message, and emits socket event", async () => {
      const req = mockRequest("user-1", { receiverId: "user-2", content: "hello" });
      const res = mockResponse();

      const next = jest.fn();
      mockedUser.findById.mockImplementation(((id: string) => {
        if (id === "user-2") return Promise.resolve({ _id: "user-2", messagePrivacy: "anyone" } as any);
        if (id === "user-1") return Promise.resolve({ _id: "user-1" } as any);
        return Promise.resolve(null);
      }) as any);

      const mockConversation = { _id: "conv-1", save: jest.fn() };
      mockedConversation.findOne.mockResolvedValue(mockConversation as any);

      const mockMessage = { _id: "msg-1", populate: jest.fn().mockReturnThis() };
      mockedMessage.create.mockResolvedValue(mockMessage as any);

      sendMessage(req as any, res as any, next);
      await flushPromises();

      expect(mockedConversation.create).not.toHaveBeenCalled();
      expect(mockConversation.save).toHaveBeenCalled();
      
      expect(mockedMessage.create).toHaveBeenCalledWith({
        conversationId: "conv-1",
        sender: "user-1",
        content: "hello"
      });

      expect(mockedEmitToUser).toHaveBeenCalledWith("user-2", "new_message", {
        message: mockMessage,
        conversationId: "conv-1"
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: mockMessage, conversationId: "conv-1" } });
    });

    it("creates a new conversation if one doesn't exist", async () => {
      const req = mockRequest("user-1", { receiverId: "user-2", content: "hello" });
      const res = mockResponse();

      const next = jest.fn();
      mockedUser.findById.mockImplementation(((id: string) => {
        if (id === "user-2") return Promise.resolve({ _id: "user-2", messagePrivacy: "anyone" } as any);
        if (id === "user-1") return Promise.resolve({ _id: "user-1" } as any);
        return Promise.resolve(null);
      }) as any);

      mockedConversation.findOne.mockResolvedValue(null);
      
      const mockConversation = { _id: "conv-2", save: jest.fn() };
      mockedConversation.create.mockResolvedValue(mockConversation as any);

      const mockMessage = { _id: "msg-2", populate: jest.fn().mockReturnThis() };
      mockedMessage.create.mockResolvedValue(mockMessage as any);

      sendMessage(req as any, res as any, next);
      await flushPromises();

      expect(mockedConversation.create).toHaveBeenCalledWith({
        participants: ["user-1", "user-2"]
      });
      expect(mockConversation.save).toHaveBeenCalled();
      expect(mockedEmitToUser).toHaveBeenCalled();
    });
  });
});
