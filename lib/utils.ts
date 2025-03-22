import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name?: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export function getFileType(filename: string): 'image' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff'].includes(ext)) {
    return 'image';
  }

  // Document files
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return 'document';
  }

  // Default to other
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function generateUniqueFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);

  return `${baseName}_${timestamp}_${randomStr}.${ext}`;
}

export function isFileSizeValid(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

export function extractFileNameInfo(path: string): {
  fileName: string;
  folder: string | null;
  ext: string;
} {
  // Get the file name from the path
  const fileName = path.split('/').pop() || path;

  // Get the folder path (everything before the file name)
  const folderPath = path.substring(0, path.lastIndexOf('/'));
  const folder = folderPath.length > 0 ? folderPath : null;

  // Get the extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  return { fileName, folder, ext };
}