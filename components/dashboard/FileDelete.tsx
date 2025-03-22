import { useState } from "react";
import { supabase } from "@/lib/db/supabase";
import { useToasts } from "@/hooks/useToast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

interface FileDeleteProps {
  filesToDelete: FileItem[];
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  onDeleteSuccess: (deletedIds: string[]) => void;
}

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

export default function FileDelete({
  filesToDelete,
  showDeleteDialog,
  setShowDeleteDialog,
  onDeleteSuccess,
}: FileDeleteProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToasts();

  const executeDelete = async () => {
    if (filesToDelete.length === 0) return;
    setDeleteLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const deletedIds: string[] = [];

      for (const file of filesToDelete) {
        try {
          const { error: storageError } = await supabase.storage
            .from("user-content")
            .remove([file.path]);
          if (storageError) {
            console.error("Storage delete error", storageError);
            errorCount++;
            continue;
          }

          const { error: dbError } = await supabase
            .from("files")
            .delete()
            .eq("id", file.id);
          if (dbError) {
            console.error("Database delete error:", dbError);
            errorCount++;
            continue;
          }

          deletedIds.push(file.id);
          successCount++;
        } catch (error) {
          console.error("Error deleting file", file.name, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        const message = successCount === 1
          ? "File deleted successfully"
          : `${successCount} files deleted successfully`;
        toast.success(message);
        onDeleteSuccess(deletedIds);
      }
      if (errorCount > 0) {
        const message = errorCount === 1
          ? "Failed to delete 1 file"
          : `Failed to delete ${errorCount} files`;
        toast.error("Error", message);
      }
    } catch (error) {
      console.error("Delete operation error:", error);
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Dialog
      open={showDeleteDialog}
      onOpenChange={(open) => {
        if (!deleteLoading) setShowDeleteDialog(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {filesToDelete.length > 1 ? "Delete files" : "Delete file"}
          </DialogTitle>
          <DialogDescription>
            {filesToDelete.length > 1
              ? `You're about to delete ${filesToDelete.length} files. This action cannot be undone.`
              : "Are you sure you want to delete this file? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        {filesToDelete.length > 0 && (
          <div className="py-4">
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {filesToDelete.map(file => (
                <div key={file.id} className="py-1 text-sm flex items-center">
                  <FileIcon type={file.type} />
                  <span className="ml-2 truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={executeDelete}
            disabled={deleteLoading}
            className="gap-2"
          >
            {deleteLoading && <Loader2 className="animate-spin h-4 w-4" />}
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
};