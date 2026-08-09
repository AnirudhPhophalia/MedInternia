import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import {
    getCertificateById,
    verifyCertificate,
    exportCertificateData,
    generateCertificate,
} from "../certificateController";

import Certificate from "../../models/Certificate";
import User from "../../models/User";
import Rating from "../../models/Rating";
import mongoose from "mongoose";

jest.mock("../../models/Certificate");
jest.mock("../../models/User");
jest.mock("../../models/Rating");

const mockedCertificate = Certificate as jest.Mocked<typeof Certificate>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedRating = Rating as jest.Mocked<typeof Rating>;

const mockResponse = () => {
    const res: Partial<Response> = {};

    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);

    return res as Response;
};

describe("Certificate Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("generateCertificate", () => {
        const validDuration = {
            startDate: "2024-01-01",
            endDate: "2024-06-01",
        };

        it("computes casesReviewed and pointsEarned from ratings and ignores client values", async () => {
            const req = {
                user: { _id: "doctor-1" },
                body: {
                    internId: "intern-1",
                    title: "Mentorship",
                    description: "Great work",
                    casesReviewed: 999,
                    pointsEarned: 9999,
                    duration: validDuration,
                    skills: ["diagnostics"],
                },
            } as unknown as AuthRequest;
            const res = mockResponse();

            mockedUser.findById.mockResolvedValue({
                _id: "doctor-1",
                userType: "doctor",
                mentoringCredits: 10,
            } as any);
            mockedUser.findOne.mockResolvedValue({
                _id: "intern-1",
                userType: "intern",
                points: 100,
            } as any);
            mockedRating.find.mockResolvedValue([
                { pointsAwarded: 8 },
                { pointsAwarded: 6 },
            ] as any);

            const fakeCert = {
                populate: jest.fn().mockResolvedValue(true),
                casesReviewed: 2,
                pointsEarned: 14,
            };
            const session = {
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                abortTransaction: jest.fn(),
                endSession: jest.fn(),
            };
            jest.spyOn(mongoose, "startSession").mockResolvedValue(session as any);
            mockedCertificate.create.mockResolvedValue([fakeCert] as any);
            mockedUser.findOneAndUpdate.mockResolvedValue({ mentoringCredits: 8 } as any);
            mockedUser.findByIdAndUpdate.mockResolvedValue({} as any);

            await generateCertificate(req, res);

            expect(mockedRating.find).toHaveBeenCalledWith({
                rater: "doctor-1",
                ratee: "intern-1",
            });
            expect(mockedCertificate.create).toHaveBeenCalledWith(
                [
                    expect.objectContaining({
                        casesReviewed: 2,
                        pointsEarned: 14,
                    }),
                ],
                expect.any(Object)
            );
            expect(mockedUser.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: "doctor-1", mentoringCredits: { $gte: 2 } },
                { $inc: { mentoringCredits: -2 } },
                expect.any(Object)
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("rejects non-admin when no ratings exist for the doctor-intern pair", async () => {
            const req = {
                user: { _id: "doctor-1" },
                body: {
                    internId: "intern-1",
                    title: "Mentorship",
                    casesReviewed: 5,
                    pointsEarned: 50,
                    duration: validDuration,
                },
            } as unknown as AuthRequest;
            const res = mockResponse();

            mockedUser.findById.mockResolvedValue({
                _id: "doctor-1",
                userType: "doctor",
                mentoringCredits: 10,
            } as any);
            mockedUser.findOne.mockResolvedValue({
                _id: "intern-1",
                userType: "intern",
                points: 100,
            } as any);
            mockedRating.find.mockResolvedValue([]);

            await generateCertificate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "At least one rated case is required to issue a certificate",
                })
            );
            expect(mockedCertificate.create).not.toHaveBeenCalled();
        });
    });

    describe("getCertificateById", () => {
        it("should return 404 when certificate is not found", async () => {
            const populate2 = jest.fn().mockResolvedValue(null);

            const populate1 = jest.fn().mockReturnValue({
                populate: populate2,
            });

            (mockedCertificate.findOne as jest.Mock).mockReturnValue({
                populate: populate1,
            });

            const req = {
                params: { certificateId: "CERT-123" },
            } as unknown as AuthRequest;

            const res = mockResponse();

            await getCertificateById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Certificate not found",
                })
            );
        });

        it("should NOT include intern email for an unrelated logged-in user", async () => {
            const fakeCert = {
                certificateId: "CERT-123",
                title: "Great Work",
                intern: { _id: "internId1", firstName: "Alice", lastName: "A", email: "alice@example.com" },
                doctor: { _id: "doctorId1", firstName: "Dr", lastName: "Bob", specialization: "Cardiology", isVerifiedDoctor: true },
                casesReviewed: 5,
                pointsEarned: 50,
                createdAt: new Date(),
                isVerified: true,
                downloadCount: 0,
                save: jest.fn().mockResolvedValue(true),
            };

            const populate2 = jest.fn().mockResolvedValue(fakeCert);
            const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
            (mockedCertificate.findOne as jest.Mock).mockReturnValue({ populate: populate1 });

            const req = {
                params: { certificateId: "CERT-123" },
                user: { _id: "unrelatedUserId", userType: "intern" },
            } as unknown as AuthRequest;

            const res = mockResponse();

            await getCertificateById(req, res);

            const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
            expect(jsonArg.data.certificate.intern.email).toBeUndefined();
            expect(jsonArg.data.certificate.intern.firstName).toBe("Alice");
        });

        it("should flag isRevoked true when certificate is not verified", async () => {
            const fakeCert = {
                certificateId: "CERT-123",
                title: "Great Work",
                intern: { _id: "internId1", firstName: "Alice", lastName: "A", email: "alice@example.com" },
                doctor: { _id: "doctorId1", firstName: "Dr", lastName: "Bob", specialization: "Cardiology", isVerifiedDoctor: true },
                casesReviewed: 5,
                pointsEarned: 50,
                createdAt: new Date(),
                isVerified: false,
                downloadCount: 0,
                save: jest.fn().mockResolvedValue(true),
            };

            const populate2 = jest.fn().mockResolvedValue(fakeCert);
            const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
            (mockedCertificate.findOne as jest.Mock).mockReturnValue({ populate: populate1 });

            const req = {
                params: { certificateId: "CERT-123" },
                user: { _id: "unrelatedUserId", userType: "intern" },
            } as unknown as AuthRequest;

            const res = mockResponse();

            await getCertificateById(req, res);

            const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
            expect(jsonArg.data.isRevoked).toBe(true);
        });
    });

    describe("verifyCertificate", () => {
        it("should return invalid verification response when certificate does not exist", async () => {
            (mockedCertificate.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const req = {
                body: {
                    certificateId: "CERT-123",
                    verificationHash: "invalid",
                },
            } as Request;

            const res = mockResponse();

            await verifyCertificate(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    data: {
                        isValid: false,
                    },
                })
            );
        });
    });

    describe("exportCertificateData", () => {
        it("should return 404 when certificate is not found", async () => {
            const populateMock = jest.fn();

            populateMock
                .mockReturnValueOnce({
                    populate: populateMock,
                })
                .mockResolvedValueOnce(null);

            (mockedCertificate.findOne as jest.Mock).mockReturnValue({
                populate: populateMock,
            });


            const req = {
                params: {
                    certificateId: "CERT-123",
                },
            } as unknown as Request;

            const res = mockResponse();

            await exportCertificateData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                })
            );
        });
    });
});
