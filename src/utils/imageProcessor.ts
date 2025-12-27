/**
 * Image processing utility for profile photo uploads
 * Compresses and resizes images before uploading to Supabase Storage
 * Supports HEIC format conversion
 */

import heic2any from 'heic2any';

export interface ProcessedImage {
    file: File;
    dataUrl: string;
    width: number;
    height: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 512; // 512x512px
const QUALITY = 0.85; // 85% quality for WebP/JPEG

/**
 * Checks if a file is a HEIC/HEIF format
 */
function isHeicFile(file: File): boolean {
    const heicMimeTypes = [
        'image/heic',
        'image/heif',
        'image/heic-sequence',
        'image/heif-sequence',
    ];
    const heicExtensions = ['.heic', '.heif', '.hif'];
    
    const lowerName = file.name.toLowerCase();
    return (
        heicMimeTypes.includes(file.type.toLowerCase()) ||
        heicExtensions.some(ext => lowerName.endsWith(ext))
    );
}

/**
 * Converts HEIC file to JPEG/PNG
 */
async function convertHeicToImage(file: File): Promise<File> {
    try {
        const convertedBlobs = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.92,
        });

        // heic2any returns an array, get the first blob
        const blob = Array.isArray(convertedBlobs) ? convertedBlobs[0] : convertedBlobs;
        
        // Create a new File from the converted blob
        const fileName = file.name.replace(/\.(heic|heif|hif)$/i, '.jpg');
        return new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch (error) {
        throw new Error(`Failed to convert HEIC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validates if the file is a valid image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check if it's an image or HEIC file
    const isImage = file.type.startsWith('image/');
    const isHeic = isHeicFile(file);
    
    if (!isImage && !isHeic) {
        return { valid: false, error: 'File must be an image' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const isAllowedType = allowedTypes.includes(file.type) || isHeic;
    
    if (!isAllowedType) {
        return { valid: false, error: 'Image must be JPEG, PNG, WebP, GIF, or HEIC' };
    }

    if (file.size > MAX_FILE_SIZE * 2) {
        return { valid: false, error: 'Image is too large. Maximum size is 4MB' };
    }

    return { valid: true };
}

/**
 * Creates an image element from a file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Resizes an image to fit within max dimensions while maintaining aspect ratio
 */
function resizeImage(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let { width, height } = img;

    if (width <= maxWidth && height <= maxHeight) {
        return { width, height };
    }

    const aspectRatio = width / height;

    if (width > height) {
        width = Math.min(width, maxWidth);
        height = width / aspectRatio;
    } else {
        height = Math.min(height, maxHeight);
        width = height * aspectRatio;
    }

    return {
        width: Math.round(width),
        height: Math.round(height),
    };
}

/**
 * Converts image to WebP format if supported, otherwise JPEG
 */
function convertToWebP(
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert image to WebP'));
                }
            },
            'image/webp',
            quality
        );
    });
}

/**
 * Converts image to JPEG format
 */
function convertToJPEG(
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert image to JPEG'));
                }
            },
            'image/jpeg',
            quality
        );
    });
}

/**
 * Processes an image file: validates, resizes, and compresses
 * Returns a processed File and data URL for preview
 */
export async function processImage(file: File): Promise<ProcessedImage> {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image file');
    }

    // Convert HEIC to JPEG if needed
    let imageFile = file;
    if (isHeicFile(file)) {
        imageFile = await convertHeicToImage(file);
    }

    // Load image
    const img = await loadImage(imageFile);

    // Calculate new dimensions
    const { width, height } = resizeImage(img, MAX_DIMENSION, MAX_DIMENSION);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Draw image on canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to WebP if supported, otherwise JPEG
    let processedBlob: Blob;
    let mimeType = 'image/jpeg';

    try {
        processedBlob = await convertToWebP(canvas, QUALITY);
        mimeType = 'image/webp';
    } catch {
        // Fallback to JPEG if WebP conversion fails
        processedBlob = await convertToJPEG(canvas, QUALITY);
        mimeType = 'image/jpeg';
    }

    // Create File object with original name but new format
    const fileName = imageFile.name.replace(/\.[^/.]+$/, '');
    const extension = mimeType === 'image/webp' ? '.webp' : '.jpg';
    const processedFile = new File([processedBlob], `${fileName}${extension}`, {
        type: mimeType,
        lastModified: Date.now(),
    });

    // Generate data URL for preview
    const dataUrl = canvas.toDataURL(mimeType, QUALITY);

    return {
        file: processedFile,
        dataUrl,
        width,
        height,
    };
}

/**
 * Gets a data URL from a file for preview purposes
 * Handles HEIC files by converting them first
 */
export async function getDataUrlFromFile(file: File): Promise<string> {
    // Convert HEIC to JPEG for preview
    let previewFile = file;
    if (isHeicFile(file)) {
        try {
            previewFile = await convertHeicToImage(file);
        } catch (error) {
            throw new Error(`Failed to convert HEIC file for preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(previewFile);
    });
}

