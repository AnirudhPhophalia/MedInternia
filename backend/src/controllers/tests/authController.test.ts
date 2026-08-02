import { Response, Request } from "express";
import {
  register,
  login,
  verifyOtp,
  resetPassword,
  changePassword,
  forgotPassword,
  sendOtp,
  refreshToken
} from "../authController";
import User from "../../models/User";
import Otp from "../../models/Otp";
import bcrypt from "bcryptjs";
import transporter from "../../utils/mailer";
import { generateToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { AuthRequest, blacklistToken, isTokenBlacklisted } from "../../middleware/auth";

jest.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: any) => fn,
}));

jest.mock("../../models/User");
jest.mock("../../models/Otp");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockImplementation((token: string) => ({ email: token, purpose: 'signup' }))
}));
jest.mock("../../utils/mailer", () => ({
  sendMail: jest.fn(),
}));
jest.mock("../../utils/jwt", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
  generateRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
  verifyRefreshToken: jest.fn(),
}));
jest.mock("../../middleware/auth", () => ({
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn(),
}));

const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedOtp = Otp as unknown as jest.Mocked<typeof Otp>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (body: any = {}, user: any = null): AuthRequest =>
  ({
    body,
    user,
  }) as unknown as AuthRequest;

describe("Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("rejects registration if duplicate email exists", async () => {
      mockedUser.findOne.mockResolvedValue({ email: "test@test.com" } as any);
      
      const req = mockRequest({
        email: "test@test.com",
        userType: "patient",
        verificationToken: "test@test.com",
      });
      const res = mockResponse();
      const next = jest.fn();

      await expect(register(req as any, res as any, next)).rejects.toThrow("User with this email already exists");
    });

    it("registers user and sets cookies", async () => {
      mockedUser.findOne.mockResolvedValue(null);
      
      const req = mockRequest({
        email: "new@test.com",
        userType: "patient",
        firstName: "Test",
        verificationToken: "new@test.com",
      });
      const res = mockResponse();
      const next = jest.fn();

      const save = jest.fn().mockResolvedValue(undefined);
      const toObject = jest.fn().mockReturnValue({ email: "new@test.com" });
      (mockedUser as unknown as jest.Mock).mockImplementation(() => ({ save, toObject, _id: "new-user-id" }) as any);

      await register(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith("token", "mock-token", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("rejects registration when a concurrent duplicate email hits the unique index", async () => {
      // Simulate a race: both concurrent requests pass the findOne check...
      mockedUser.findOne.mockResolvedValue(null);

      const save = jest.fn().mockRejectedValue({ code: 11000, keyPattern: { email: 1 } });
      const toObject = jest.fn().mockReturnValue({ email: "new@test.com" });
      (mockedUser as unknown as jest.Mock).mockImplementation(() => ({ save, toObject, _id: "new-user-id" }) as any);

      const req = mockRequest({
        email: "new@test.com",
        userType: "patient",
        firstName: "Test",
        verificationToken: "new@test.com",
      });
      const res = mockResponse();
      const next = jest.fn();

      await expect(register(req as any, res as any, next)).rejects.toThrow("User with this email already exists");
    });

    it("rejects registration when a concurrent duplicate license number hits the unique index", async () => {
      mockedUser.findOne.mockResolvedValue(null);

      const save = jest.fn().mockRejectedValue({ code: 11000, keyPattern: { licenseNumber: 1 } });
      const toObject = jest.fn().mockReturnValue({ email: "doc@test.com" });
      (mockedUser as unknown as jest.Mock).mockImplementation(() => ({ save, toObject, _id: "new-user-id" }) as any);

      const req = mockRequest({
        email: "doc@test.com",
        userType: "doctor",
        firstName: "Test",
        lastName: "Doc",
        specialization: "Cardiology",
        licenseNumber: "LIC-123",
        verificationToken: "doc@test.com",
      });
      const res = mockResponse();
      const next = jest.fn();

      await expect(register(req as any, res as any, next)).rejects.toThrow(
        "Doctor with this license number already exists"
      );
    });
  });

  describe("login", () => {
    it("rejects login with wrong password and increments attempts", async () => {
      const userMock = {
        _id: "user-1",
        email: "test@test.com",
        isActive: true,
        loginAttempts: 2,
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);
      mockedUser.findByIdAndUpdate.mockResolvedValue({} as any);

      const req = mockRequest({ email: "test@test.com", password: "wrong" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(login(req as any, res as any, next)).rejects.toThrow("Invalid email or password");
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("user-1", expect.objectContaining({
        $inc: { loginAttempts: 1 }
      }));
    });

    it("triggers lockout when attempts exceed 5", async () => {
      const userMock = {
        _id: "user-1",
        email: "test@test.com",
        isActive: true,
        loginAttempts: 4, // it increments to 5 inside the block and sets lockout
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ email: "test@test.com", password: "wrong" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(login(req as any, res as any, next)).rejects.toThrow("Invalid email or password");
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("user-1", expect.objectContaining({
        $set: expect.objectContaining({ lockoutUntil: expect.any(Date) })
      }));
    });

    it("rejects login if user is locked out", async () => {
      const futureDate = new Date(Date.now() + 10000);
      const userMock = {
        _id: "user-1",
        isActive: true,
        lockoutUntil: futureDate
      };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ email: "test@test.com", password: "pwd" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(login(req as any, res as any, next)).rejects.toThrow(/Account is locked/);
    });

    it("successfully logs in and resets attempts", async () => {
      const userMock = {
        _id: "user-1",
        email: "test@test.com",
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ email: "test@test.com" })
      };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ email: "test@test.com", password: "pwd" });
      const res = mockResponse();
      const next = jest.fn();

      await login(req as any, res as any, next);
      
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("user-1", {
        $set: { loginAttempts: 0, lockoutUntil: null }
      });
      expect(res.cookie).toHaveBeenCalledWith("token", "mock-token", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("verifyOtp & resetPassword", () => {
    it("rejects OTP if not found or expired", async () => {
      mockedOtp.findOne.mockResolvedValue(null);

      const req = mockRequest({ email: "test@test.com", otp: "123456" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(verifyOtp(req as any, res as any, next)).rejects.toThrow("OTP not found");
    });

    it("rejects OTP on mismatch and increments attempts", async () => {
      const otpMock = {
        _id: "otp-1",
        expiresAt: new Date(Date.now() + 10000),
        attempts: 1,
        otpHash: "hash",
        save: jest.fn()
      };
      mockedOtp.findOne.mockResolvedValue(otpMock as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
      (mockedOtp.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...otpMock,
        attempts: 2,
      });

      const req = mockRequest({ email: "test@test.com", otp: "wrong", newPassword: "newpwd" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(resetPassword(req as any, res as any, next)).rejects.toThrow("Invalid OTP");
      expect(mockedOtp.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "otp-1", attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
        { new: true }
      );
    });

    it("locks out after the OTP attempts cap is reached", async () => {
      const otpMock = {
        _id: "otp-1",
        expiresAt: new Date(Date.now() + 10000),
        attempts: 4,
        otpHash: "hash",
      };
      mockedOtp.findOne.mockResolvedValue(otpMock as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
      (mockedOtp.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...otpMock,
        attempts: 5,
      });
      mockedOtp.deleteOne.mockResolvedValue({} as any);

      const req = mockRequest({ email: "test@test.com", otp: "wrong", newPassword: "newpwd" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(resetPassword(req as any, res as any, next)).rejects.toThrow(
        "Too many incorrect attempts"
      );
      expect(mockedOtp.deleteOne).toHaveBeenCalledWith({ _id: "otp-1" });
    });


    it("resets password successfully on valid OTP", async () => {
      const otpMock = {
        _id: "otp-1",
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        otpHash: "hash",
      };
      mockedOtp.findOne.mockResolvedValue(otpMock as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedOtp.deleteOne.mockResolvedValue({} as any);

      const userMock = {
        _id: "user-1",
        save: jest.fn().mockResolvedValue(undefined)
      };
      mockedUser.findOne.mockResolvedValue(userMock as any);

      const req = mockRequest({ email: "test@test.com", otp: "123456", newPassword: "newpassword" });
      const res = mockResponse();
      const next = jest.fn();

      await resetPassword(req as any, res as any, next);

      expect(userMock.save).toHaveBeenCalled();
      expect(mockedOtp.deleteOne).toHaveBeenCalledWith({ _id: "otp-1" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("changePassword", () => {
    it("rejects change if current password is wrong", async () => {
      const userMock = {
        _id: "user-1",
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      mockedUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ currentPassword: "wrong", newPassword: "newpassword" }, { _id: "user-1" });
      const res = mockResponse();
      const next = jest.fn();

      await expect(changePassword(req as any, res as any, next)).rejects.toThrow("Current password is incorrect");
    });

    it("successfully changes password", async () => {
      const userMock = {
        _id: "user-1",
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(undefined)
      };
      mockedUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ currentPassword: "correct", newPassword: "newpassword" }, { _id: "user-1" });
      const res = mockResponse();
      const next = jest.fn();

      await changePassword(req as any, res as any, next);
      expect(userMock.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("refreshToken", () => {
    it("rejects the request when no refresh token is provided", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await expect(refreshToken(req as any, res as any, jest.fn())).rejects.toThrow(
        "Refresh token is required"
      );
      expect(blacklistToken).not.toHaveBeenCalled();
    });

    it("rejects an invalid or expired refresh token", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue(null);

      const req = mockRequest({ refreshToken: "stale-token" });
      const res = mockResponse();

      await expect(refreshToken(req as any, res as any, jest.fn())).rejects.toThrow(
        "Invalid or expired refresh token"
      );
      expect(blacklistToken).not.toHaveBeenCalled();
    });

    it("rejects a refresh token that has already been revoked", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: "user-1",
        email: "test@test.com",
        userType: "patient",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const req = mockRequest({ refreshToken: "stolen-token" });
      const res = mockResponse();

      await expect(refreshToken(req as any, res as any, jest.fn())).rejects.toThrow(
        "Refresh token has been revoked"
      );
      expect(blacklistToken).not.toHaveBeenCalled();
    });

    it("rotates the refresh token by blacklisting the consumed token", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: "user-1",
        email: "test@test.com",
        userType: "patient",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);

      const userMock = { _id: "user-1", email: "test@test.com", isActive: true, userType: "patient" };
      mockedUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = mockRequest({ refreshToken: "old-refresh-token" });
      const res = mockResponse();

      await refreshToken(req as any, res as any, jest.fn());

      expect(isTokenBlacklisted).toHaveBeenCalledWith("old-refresh-token");
      expect(blacklistToken).toHaveBeenCalledWith("old-refresh-token", expect.any(Date));
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", "mock-refresh-token", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("reads the refresh token from the HTTP-only cookie when the body is empty", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: "user-1",
        email: "test@test.com",
        userType: "patient",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);

      const userMock = { _id: "user-1", email: "test@test.com", isActive: true, userType: "patient" };
      mockedUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(userMock)
      } as any);

      const req = {
        body: {},
        cookies: { refresh_token: "cookie-refresh-token" },
      };
      const res = mockResponse();

      await refreshToken(req as any, res as any, jest.fn());

      expect(blacklistToken).toHaveBeenCalledWith("cookie-refresh-token", expect.any(Date));
    });
  });
});
