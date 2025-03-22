"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/db/supabase";
import { useToasts } from "@/hooks/useToast";
import { User } from "@/lib/types";

interface FileUploadProps {
  user: User;
  onUploadComplete?: (fileUrl?: string, fileName?: string) => void;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
  folder?: string;
};

export default function FileUpload({
  user,
  onUploadComplete,
  maxFileSizeMB = 50,
  acceptedFileTypes = "*",
  folder = "documents"
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToasts();

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (selectedFile.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(
        "File too large",
        `Maximum file size is ${maxFileSizeMB}MB`
      );
      return;
    };
    setFile(selectedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    handleFileChange(selectedFile);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const selectedFile = e.dataTransfer.files?.[0] || null;
    handleFileChange(selectedFile);
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    if (inputRef.current) {
      inputRef.current.value = "";
    };
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return "image";
    } else if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
      return "document";
    } else {
      return "other";
    }
  };

  const uploadFile = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `user-files/${user.id}/${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("user-content")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      clearInterval(progressInterval);
      setProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-content")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("files")
        .insert({
          name: file.name,
          size: file.size,
          type: getFileType(file.name),
          path: filePath,
          user_id: user.id,
          folder: folder,
          url: publicUrl
        });

      if (insertError) throw insertError;

      if (onUploadComplete) {
        onUploadComplete(publicUrl, file.name);
      }

      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error("Upload failed", "Something went wrong");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              dragActive ? "border-primary bg-primary/5" : "border-gray-200"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <UploadCloud className="h-10 w-10 text-gray-300" />
              <div>
                <p className="font-medium">Drag and drop your file here</p>
                <p className="text-sm text-gray-500">or click to browse (max {maxFileSizeMB}MB)</p>
              </div>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="mt-2"
              >
                Select Files
              </Button>
              <Input
                ref={inputRef}
                type="file"
                accept={acceptedFileTypes}
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
              <File className="h-6 w-6 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        {file && (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadFile}
              disabled={uploading || !file}
              size="sm"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin"></Loader2>
                  Uploading...
                </span>
              ) : (
                "Upload"
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}