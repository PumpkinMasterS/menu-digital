import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { MediaFile } from '@/types';

// Image compression and resize utilities
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  compression?: ImageCompressionOptions;
}

/**
 * Compress and resize image file
 */
export const compressImage = (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File(
              [blob],
              `compressed_${file.name.split('.')[0]}.${format}`,
              { type: `image/${format}` }
            );
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate thumbnail from image file
 */
export const generateThumbnail = (
  file: File,
  size: { width: number; height: number } = { width: 300, height: 200 }
): Promise<File> => {
  return compressImage(file, {
    maxWidth: size.width,
    maxHeight: size.height,
    quality: 0.7,
    format: 'jpeg'
  });
};

/**
 * Validate file type and size
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const { maxSize = 50 * 1024 * 1024, allowedTypes = [] } = options; // 50MB default

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Upload file to Supabase storage with optional compression and thumbnail
 */
export const uploadMediaFile = async (
  file: File,
  options: UploadOptions = {}
): Promise<MediaFile> => {
  const {
    bucket = 'content_files',
    folder = 'uploads',
    generateThumbnail: shouldGenerateThumbnail = true,
    thumbnailSize = { width: 300, height: 200 },
    compression
  } = options;

  try {
    // Validate file
    const validation = validateFile(file, {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav'
      ]
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}_${randomStr}.${extension}`;
    const filePath = `${folder}/${filename}`;

    let finalFile = file;

    // Compress image if it's an image and compression is requested
    if (file.type.startsWith('image/') && compression) {
      logger.info('Compressing image', { filename: file.name, originalSize: file.size });
      finalFile = await compressImage(file, compression);
      logger.info('Image compressed', { 
        filename: finalFile.name, 
        compressedSize: finalFile.size,
        compressionRatio: ((file.size - finalFile.size) / file.size * 100).toFixed(1)
      });
    }

    // Upload main file
    logger.info('Uploading file to storage', { bucket, filePath });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, finalFile);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    let thumbnailUrl: string | undefined;

    // Generate and upload thumbnail for images
    if (file.type.startsWith('image/') && shouldGenerateThumbnail) {
      try {
        logger.info('Generating thumbnail', { filename: file.name });
        const thumbnailFile = await generateThumbnail(file, thumbnailSize);
        const thumbnailPath = `${folder}/thumbnails/thumb_${filename}`;

        const { error: thumbError } = await supabase.storage
          .from(bucket)
          .upload(thumbnailPath, thumbnailFile);

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(thumbnailPath);
          
          thumbnailUrl = thumbUrlData.publicUrl;
          logger.info('Thumbnail generated successfully', { thumbnailPath });
        }
      } catch (thumbError) {
        logger.warn('Failed to generate thumbnail', thumbError);
        // Continue without thumbnail - not critical
      }
    }

    const mediaFile: MediaFile = {
      id: uploadData.path,
      filename,
      originalName: file.name,
      mimeType: finalFile.type,
      size: finalFile.size,
      url: urlData.publicUrl,
      thumbnailUrl,
      uploadedBy: 'current-user', // TODO: Get from auth context
      uploadedAt: new Date().toISOString()
    };

    logger.info('File uploaded successfully', {
      filename: mediaFile.filename,
      size: mediaFile.size,
      url: mediaFile.url,
      hasThumbnail: !!thumbnailUrl
    });

    return mediaFile;

  } catch (error) {
    logger.error('Failed to upload media file', error, { filename: file.name });
    throw error;
  }
};

/**
 * Delete media file and its thumbnail from storage
 */
export const deleteMediaFile = async (
  mediaFile: MediaFile,
  bucket: string = 'content_files'
): Promise<void> => {
  try {
    // Delete main file
    const mainPath = mediaFile.id;
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([mainPath]);

    if (deleteError) {
      throw deleteError;
    }

    // Delete thumbnail if exists
    if (mediaFile.thumbnailUrl) {
      const thumbnailPath = `uploads/thumbnails/thumb_${mediaFile.filename}`;
      await supabase.storage
        .from(bucket)
        .remove([thumbnailPath]);
    }

    logger.info('Media file deleted successfully', { filename: mediaFile.filename });

  } catch (error) {
    logger.error('Failed to delete media file', error, { filename: mediaFile.filename });
    throw error;
  }
};

/**
 * Get optimized image URL with transformation parameters
 */
export const getOptimizedImageUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  // If using a CDN or image optimization service, apply transformations
  // For now, return the original URL
  // TODO: Implement image transformations if using services like Cloudinary or ImageKit
  
  const { width, height, quality = 80, format = 'auto' } = options;
  
  // Example for future CDN integration:
  // return `${url}?w=${width}&h=${height}&q=${quality}&f=${format}`;
  
  return url;
};

/**
 * Extract metadata from media file
 */
export const extractMediaMetadata = (file: File): Promise<{
  duration?: number;
  dimensions?: { width: number; height: number };
  hasAudio?: boolean;
}> => {
  return new Promise((resolve) => {
    const metadata: any = {};

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        metadata.dimensions = { width: img.width, height: img.height };
        resolve(metadata);
      };
      img.onerror = () => resolve(metadata);
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        metadata.duration = video.duration;
        metadata.dimensions = { width: video.videoWidth, height: video.videoHeight };
        metadata.hasAudio = (video as any).mozHasAudio || Boolean((video as any).webkitAudioDecodedByteCount) || video.duration > 0;
        resolve(metadata);
      };
      video.onerror = () => resolve(metadata);
      video.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('audio/')) {
      const audio = document.createElement('audio');
      audio.onloadedmetadata = () => {
        metadata.duration = audio.duration;
        metadata.hasAudio = true;
        resolve(metadata);
      };
      audio.onerror = () => resolve(metadata);
      audio.src = URL.createObjectURL(file);
    } else {
      resolve(metadata);
    }
  });
};

// Predefined image compression presets
export const IMAGE_PRESETS = {
  thumbnail: { maxWidth: 300, maxHeight: 200, quality: 0.7 },
  medium: { maxWidth: 800, maxHeight: 600, quality: 0.8 },
  large: { maxWidth: 1920, maxHeight: 1080, quality: 0.85 },
  original: { maxWidth: 4000, maxHeight: 4000, quality: 0.9 }
} as const;

// Allowed file types for different content types
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  archive: ['application/zip', 'application/x-rar-compressed']
} as const; 