import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';

let configured = false;

const ensureCloudinaryConfigured = () => {
  if (configured) {
    return;
  }

  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    configured = true;
    return;
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  configured = true;
};

/**
 * Generates a signed URL for authenticated Cloudinary resources
 * URLs expire after 15 minutes by default
 * @param publicId - Cloudinary public ID of the resource
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL for authenticated access
 */
export const generateSignedUrl = (publicId: string, expiresIn: number = 900): string => {
  ensureCloudinaryConfigured();

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
    secure: true
  });
};

export const uploadProfileImage = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadApiResponse> => {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'medinternia/profile-pictures',
        public_id: `profile-${userId}-${Date.now()}`,
        overwrite: true,
        resource_type: 'image',
        type: 'authenticated',
        transformation: [
          {
            width: 512,
            height: 512,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            fetch_format: 'auto'
          }
        ]
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed without a result'));
          return;
        }
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

export const uploadCaseAttachment = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadApiResponse> => {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'medinternia/cases',
        public_id: `case-${userId}-${Date.now()}`,
        resource_type: 'auto',
        type: 'authenticated'
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed without a result'));
          return;
        }
        resolve(result);
      }
    );

    stream.on('error', reject);

    if (file.path) {
      fs.createReadStream(file.path)
        .on('error', reject)
        .pipe(stream);
    } else {
      stream.end(file.buffer);
    }
  });
};
