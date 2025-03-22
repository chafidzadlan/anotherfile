"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Check, X as XIcon, Download } from "lucide-react";
import { useToasts } from "@/hooks/useToast";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  path: string;
  folder: string;
}

interface DownloadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "pending" | "downloading" | "complete" | "error";
  error?: string;
}

interface FileDownloadProps {
  files: FileItem[];
  selectedFiles: string[];
  formatFileSize: (bytes: number) => string;
  onDownload?: (fileId: string) => void;
}

export interface FileDownloadHandle {
  downloadFile: (fileId: string, url: string, fileName: string) => Promise<void>;
}

const FileDownload = forwardRef<FileDownloadHandle, FileDownloadProps>(
  ({ files, selectedFiles, formatFileSize, onDownload }, ref) => {
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
    const toast = useToasts();

    useEffect(() => {
      const cleanupControllers = () => {
        abortControllersRef.current.forEach((controller) => {
          controller.abort();
        });
        abortControllersRef.current.clear();
      };
      return cleanupControllers;
    }, []);

    useImperativeHandle(ref, () => ({
      downloadFile: async (fileId: string, url: string, fileName: string) => {
        await downloadFile(fileId, url, fileName);
      }
    }));

    const downloadFile = async (fileId: string, url: string, fileName: string) => {
      const abortController = new AbortController();
      abortControllersRef.current.set(fileId, abortController);

      setDownloadProgress((prev) => [
        ...prev.filter(p => p.fileId !== fileId),
        {
          fileId,
          fileName,
          progress: 0,
          status: "downloading",
        }
      ]);

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentLength = response.headers.get("Content-Length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          if (total > 0) {
            const progress = Math.min(Math.round((receivedLength / total) * 100), 100);
            setDownloadProgress(prev => prev.map(p =>
              p.fileId === fileId ? { ...p, progress } : p
            ));
          }
        }

        const chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          chunksAll.set(chunk, position);
          position += chunk.length;
        }

        const blob = new Blob([chunksAll]);
        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        setDownloadProgress(prev => prev.map(p =>
          p.fileId === fileId ? { ...p, progress: 100, status: "complete" } : p
        ));

        setTimeout(() => {
          setDownloadProgress(prev => prev.filter(p => p.fileId !== fileId));
          abortControllersRef.current.delete(fileId);
        }, 3000);

        logDownloadToHistory(fileId, fileName);
        if (onDownload) {
          onDownload(fileId);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.log("Download was cancelled");
          setDownloadProgress(prev => prev.filter(p => p.fileId !== fileId));
        } else {
          console.error("Download error:", error);
          setDownloadProgress(prev => prev.map(p =>
            p.fileId === fileId ? {
              ...p,
              status: "error",
              error: (error as Error).message || "Failed to download",
            } : p
          ));

          setTimeout(() => {
            if (abortControllersRef.current.has(fileId)) {
              const file = files.find(f => f.id === fileId);
              if (file) {
                downloadFile(file.id, file.url, file.name);
              }
            }
          }, 2000);
        }
      } finally {
        abortControllersRef.current.delete(fileId);
      }
    };

    const cancelDownload = (fileId: string) => {
      const controller = abortControllersRef.current.get(fileId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(fileId);
        setDownloadProgress(prev => prev.filter(p => p.fileId !== fileId));
        toast.info("Download cancelled");
      }
    };

    const handleDownloadSelectedFiles = () => {
      if (selectedFiles.length > 1) {
        setShowDownloadDialog(true);
      } else if (selectedFiles.length === 1) {
        const fileId = selectedFiles[0];
        const file = files.find(f => f.id === fileId);
        if (file) {
          downloadFile(file.id, file.url, file.name);
        }
      }
    };

    const bulkDownloadFiles = () => {
      const filesToDownload = files.filter(file => selectedFiles.includes(file.id));
      filesToDownload.forEach((file, index) => {
        setTimeout(() => {
          downloadFile(file.id, file.url, file.name);
        }, index * 500);
      });
      setShowDownloadDialog(false);
    };

    const logDownloadToHistory = (fileId: string, fileName: string) => {
      try {
        const now = new Date();
        const history = JSON.parse(localStorage.getItem("downloadHistory") || "[]");
        history.unshift({
          id: fileId,
          name: fileName,
          date: now.toISOString(),
        });

        const trimmedHistory = history.slice(0, 50);
        localStorage.setItem("downloadHistory", JSON.stringify(trimmedHistory));

        const storedActivity = JSON.parse(localStorage.getItem("fileActivity") || "{}");
        const updatedActivity = {
          ...storedActivity,
          [fileId]: {
            fileId,
            lastViewed: storedActivity[fileId]?.lastViewed || now.toISOString(),
            lastDownloaded: now.toISOString(),
            viewCount: storedActivity[fileId]?.viewCount || 0,
          }
        };
        localStorage.setItem("fileActivity", JSON.stringify(updatedActivity));
      } catch (error) {
        console.error("Failed to log download to history", error);
      }
    };

    const FileIcon = ({ type }: { type: string }) => {
      switch (type) {
        case "image":
          return <div className="h-6 w-6 text-blue-500">🖼️</div>;
        case "document":
          return <div className="h-6 w-6 text-green-500">📄</div>;
        default:
          return <div className="h-6 w-6 text-gray-500">📁</div>;
      }
    };

    return (
      <>
        {/* Download Button */}
        {selectedFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSelectedFiles}
            className="flex items-center gap-1"
            disabled={selectedFiles.length === 0}
          >
            <Download className="h-4 w-4" />
            Download {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ""}
          </Button>
        )}
        {/* Download Progress Panel */}
        {downloadProgress.length > 0 && (
          <div className="mt-6 px-3 pt-3 border-t">
            <div className="text-xs font-medium text-gray-700 mb-2">Downloads</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {downloadProgress.map((item) => (
                <div key={item.fileId} className="text-xs">
                  <div className="flex justify-between items-center">
                    <div className="truncate max-w-[140px]" title={item.fileName}>
                      {item.fileName}
                    </div>
                    {item.status === "complete" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : item.status === "error" ? (
                      <span className="text-red-500">!</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => cancelDownload(item.fileId)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {item.status === "downloading" && (
                    <Progress value={item.progress} className="h-1 mt-1" />
                  )}
                  {item.status === "error" && (
                    <p className="text-red-500 text-[10px] truncate">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Download Dialog */}
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Download Files</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4">You&apos;re about to download {selectedFiles.length} files.</p>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {selectedFiles.map(fileId => {
                  const file = files.find(f => f.id === fileId);
                  return file ? (
                    <div key={fileId} className="py-1 text-sm flex justify-between items-center">
                      <div className="flex items-center">
                        <FileIcon type={file.type} />
                        <span className="ml-2 truncate">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <p className="mt-4 text-sm text-gray-500">Files will be downloaded individually to your device.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>Cancel</Button>
              <Button onClick={bulkDownloadFiles}>Download All</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

FileDownload.displayName = "FileDownload";

export default FileDownload;