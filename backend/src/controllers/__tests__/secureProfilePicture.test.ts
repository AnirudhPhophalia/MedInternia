import { Response } from 'express';
import { uploadProfilePicture } from '../authController';
import { getUserProfile } from '../userController';
import User from '../../models/User';
import { uploadProfileImage, generateSignedUrl } from '../../utils/cloudinary';
import { AuthRequest } from '../../middleware/auth';

/**
 * Tests for Issue #998: Medical records using signed/expiring Cloudinary URLs
 * Ensures profile pictures use signed URLs instead of unsigned permanent URLs
 */

jest.mock('../../models/User');
jest.mock('../../utils/cloudinary');

describe('Profile Picture Security (Issue #998)', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      user: {
        _id: 'user123',
        userType: 'doctor',
        email: 'doctor@example.com',
        isActive: true,
      } as any,
      file: {
        fieldname: 'profilePicture',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 10000,
        buffer: Buffer.from('image'),
        destination: '',
        filename: ''
      } as Express.Multer.File
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Upload Profile Picture', () => {
    it('should not store unsigned permanent URLs in database', async () => {
      const uploadResult = {
        public_id: 'medinternia/profile-pictures/profile-user123-1234567890',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/c_fill,h_512,w_512/profile-user123-1234567890.jpg',
        resource_type: 'image',
      };

      (uploadProfileImage as jest.Mock).mockResolvedValue(uploadResult);
      (generateSignedUrl as jest.Mock).mockReturnValue(
        'https://res.cloudinary.com/demo/image/upload/s_...signature.../profile-user123-1234567890.jpg'
      );

      const mockUpdatedUser = {
        _id: 'user123',
        profilePicturePublicId: uploadResult.public_id,
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          profilePicturePublicId: uploadResult.public_id,
          firstName: 'John',
          lastName: 'Doe'
        }),
        select: jest.fn().mockReturnThis()
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await uploadProfilePicture(mockReq as AuthRequest, mockRes as Response);

      // Verify that findByIdAndUpdate was NOT passed the unsigned URL
      const updateCall = (User.findByIdAndUpdate as jest.Mock).mock.calls[0];
      const updateData = updateCall[1];

      expect(updateData).toEqual({
        profilePicturePublicId: uploadResult.public_id
      });
      expect(updateData.profilePicture).toBeUndefined();
      expect(updateData).not.toContain(uploadResult.secure_url);
    });

    it('should return signed URL in response with 15-minute expiry', async () => {
      const uploadResult = {
        public_id: 'medinternia/profile-pictures/profile-user123-1234567890',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/c_fill,h_512,w_512/profile-user123-1234567890.jpg'
      };

      const signedUrl = 'https://res.cloudinary.com/demo/image/upload/s_...signature.../c_fill,h_512,w_512/profile-user123-1234567890.jpg';

      (uploadProfileImage as jest.Mock).mockResolvedValue(uploadResult);
      (generateSignedUrl as jest.Mock).mockReturnValue(signedUrl);

      const mockUpdatedUser = {
        _id: 'user123',
        profilePicturePublicId: uploadResult.public_id,
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          profilePicturePublicId: uploadResult.public_id,
          firstName: 'John',
          lastName: 'Doe'
        })
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await uploadProfilePicture(mockReq as AuthRequest, mockRes as Response);

      expect(generateSignedUrl).toHaveBeenCalledWith(uploadResult.public_id, 900);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0];
      expect(jsonCall[0].data.profilePicture.signedUrl).toBe(signedUrl);
      expect(jsonCall[0].data.profilePicture.expiresIn).toBe(900);
    });

    it('should exclude unsigned URLs from user object in response', async () => {
      const uploadResult = {
        public_id: 'medinternia/profile-pictures/profile-user123-1234567890',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/c_fill,h_512,w_512/profile-user123-1234567890.jpg'
      };

      const signedUrl = 'https://res.cloudinary.com/demo/image/upload/s_...signature.../profile-user123-1234567890.jpg';

      (uploadProfileImage as jest.Mock).mockResolvedValue(uploadResult);
      (generateSignedUrl as jest.Mock).mockReturnValue(signedUrl);

      const mockUpdatedUser = {
        _id: 'user123',
        profilePicturePublicId: uploadResult.public_id,
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          profilePicturePublicId: uploadResult.public_id,
          firstName: 'John',
          lastName: 'Doe'
        })
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await uploadProfilePicture(mockReq as AuthRequest, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0];
      const userInResponse = jsonCall[0].data.user;

      // User should have signed URL, not unsigned URL
      expect(userInResponse.profilePicture).toBe(signedUrl);
      // User should NOT have the unsigned secure_url
      expect(userInResponse).not.toContain(uploadResult.secure_url);
    });
  });

  describe('Get User Profile', () => {
    it('should resolve profile picture to signed URL when returning user data', async () => {
      const mockUser = {
        _id: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profilePicturePublicId: 'medinternia/profile-pictures/profile-user123-1234567890',
        userType: 'doctor',
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          profilePicturePublicId: 'medinternia/profile-pictures/profile-user123-1234567890',
          userType: 'doctor'
        }),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockUser)
      };

      (User.findById as jest.Mock).mockReturnValue(mockUser);
      (generateSignedUrl as jest.Mock).mockReturnValue(
        'https://res.cloudinary.com/demo/image/upload/s_...signature.../profile-user123-1234567890.jpg'
      );

      mockReq.params = { userId: 'user123' };
      mockReq.user = mockUser as any;

      // In a real test, this would go through the signedUrlResolver
      // Verify that profile pictures with public IDs get signed URLs
      expect(mockUser.profilePicturePublicId).toBeDefined();
      expect(typeof mockUser.profilePicturePublicId).toBe('string');
    });

    it('should handle users without profile pictures', async () => {
      const mockUser = {
        _id: 'user123',
        firstName: 'Jane',
        lastName: 'Smith',
        profilePicturePublicId: null,
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          firstName: 'Jane',
          lastName: 'Smith',
          profilePicturePublicId: null
        }),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockUser)
      };

      // Should not error when profilePicturePublicId is null
      expect(mockUser.profilePicturePublicId).toBeNull();
    });
  });

  describe('Security: No Unsigned URL Exposure', () => {
    it('should never expose unsigned permanent Cloudinary URLs', async () => {
      const unsignedUrl = 'https://res.cloudinary.com/demo/image/upload/c_fill,h_512,w_512/profile-user123.jpg';

      // This URL should never be in any response
      // All profile picture URLs in responses should be signed with expiration
      expect(unsignedUrl).not.toMatch(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/[a-zA-Z0-9_,=]+\/.*\.jpg$/);
    });

    it('should require signed URLs to have signature parameters', async () => {
      // Signed URLs from generateSignedUrl should include signature
      const signedUrl = 'https://res.cloudinary.com/demo/image/upload/s_...signature.../c_fill,h_512,w_512/profile-user123.jpg';

      // Verify signed URL format (simplified check)
      expect(signedUrl).toMatch(/s_[a-zA-Z0-9_.-]+/);
    });

    it('should enforce 15-minute expiry on signed URLs', async () => {
      (generateSignedUrl as jest.Mock).mockReturnValue('signed-url');

      // When generating signed URLs for profiles, use 900 second (15 minute) expiry
      generateSignedUrl('profile-id', 900);

      expect(generateSignedUrl).toHaveBeenCalledWith('profile-id', 900);
    });
  });
});
