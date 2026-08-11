import { generateSignedUrl } from './cloudinary';
import type { IUser } from '../models/User';

/**
 * Resolves profilePicture field to a signed URL if profilePicturePublicId exists
 * Returns user data with signed URL for profile picture (15-minute expiry)
 * Issue #998: Prevent permanent unsigned URLs from being exposed
 */
export const resolveProfilePictureUrl = (user: IUser): IUser & { profilePicture?: string } => {
  const userObj = user.toObject ? user.toObject() : user;

  // Always remove the stored URL field to prevent exposure of unsigned URLs
  delete (userObj as any).profilePicture;

  const publicId = (user as any).profilePicturePublicId || userObj.profilePicturePublicId;
  delete userObj.profilePicturePublicId;

  // If public ID exists, generate a signed URL for the response
  if (publicId) {
    return {
      ...userObj,
      profilePicture: generateSignedUrl(publicId, 900)
    };
  }

  return userObj;
};

/**
 * Batch resolves multiple users' profile pictures to signed URLs
 */
export const resolveProfilePictureUrls = (users: IUser[]): Array<IUser & { profilePicture?: string }> => {
  return users.map(resolveProfilePictureUrl);
};
