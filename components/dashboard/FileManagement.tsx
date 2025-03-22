"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/db/supabase";
import { useToasts } from "@/hooks/useToast";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Image as ImageIcon, File, MoreVertical, Download, Trash2, Grid, List, Plus, Search, Cloud, Clock, Star, Users, Folder } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import FileUpload from "@/components/dashboard/FileUpload";
import FileDelete from "@/components/dashboard/FileDelete";
import FileDownload, { FileDownloadHandle } from "@/components/dashboard/FileDownload";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface FileManagementProps {
  user: User;
}

interface FileActivity {
  fileId: string;
  lastViewed: string;
  lastDownloaded: string;
  viewCount: number;
};

export default function FileManagement({ user }: FileManagementProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"grid" | "list">("list");
  const [activeFolder, setActiveFolder] = useState<string>("my-drive");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);
  const [fileActivity, setFileActivity] = useState<Record<string, FileActivity>>({});
  const [recentSortBy, setRecentSortBy] = useState<"accessed" | "modified" | "downloaded">("accessed");
  const [recentTimeframe, setRecentTimeframe] = useState<"day" | "week" | "month">("week");
  const toast = useToasts();

  const fileDownloadRef = useRef<FileDownloadHandle>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error", "Error fetching files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const storedActivity = localStorage.getItem("fileActivity");
      if (storedActivity) {
        setFileActivity(JSON.parse(storedActivity));
      }

      const downloadHistory = localStorage.getItem("downloadHistory");
      if (downloadHistory) {
        const downloads = JSON.parse(downloadHistory);
        const updatedActivity = { ...fileActivity };
        downloads.forEach((download: { id: string; date: string }) => {
          if (!updatedActivity[download.id]) {
            updatedActivity[download.id] = {
              fileId: download.id,
              lastDownloaded: download.date,
              lastViewed: "",
              viewCount: 0
            };
          } else {
            updatedActivity[download.id].lastDownloaded = download.date;
          }
        });

        setFileActivity(updatedActivity);
        localStorage.setItem("fileActivity", JSON.stringify(updatedActivity));
      }
    } catch (error) {
      console.error("Failed to load file activity data", error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [user.id]);

  const handleUploadComplete = () => {
    fetchFiles();
    setShowUploadDialog(false);
    toast.success(`File uploaded successfully`);
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    const fileToDelete = files.find(file => file.id === fileId);
    if (fileToDelete) {
      fileToDelete.path = filePath;
      setFilesToDelete([fileToDelete]);
      setShowDeleteDialog(true);
    }
  };

  const handleBulkDelete = () => {
    const selectedFilesData = files.filter(file => selectedFiles.includes(file.id));
    setFilesToDelete(selectedFilesData);
    setShowDeleteDialog(true);
  }

  const handleDeleteSuccess = (deletedIds: string[]) => {
    setFiles(prevFiles => prevFiles.filter(file => !deletedIds.includes(file.id)));
    setSelectedFiles(prev => prev.filter(id => !deletedIds.includes(id)));
    setFilesToDelete([]);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownloadFile = (fileId: string, url: string, fileName: string) => {
    if (fileDownloadRef.current) {
      fileDownloadRef.current.downloadFile(fileId, url, fileName);
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  };

  const FileIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-6 w-6 text-blue-500" />;
      case "document":
        return <FileText className="h-6 w-6 text-green-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const calculateUsedStorage = () => {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(totalBytes);
  };

  const folderTypeMap = {
    "my-drive": { icon: <Cloud className="h-4 w-4" />, label: "My Drive" },
    "recent": { icon: <Clock className="h-4 w-4" />, label: "Recent" },
    "starred": { icon: <Star className="h-4 w-4" />, label: "Starred" },
    "shared": { icon: <Users className="h-4 w-4" />, label: "Shared with me" },
    "images": { icon: <ImageIcon className="h-4 w-4" />, label: "Images" },
    "documents": { icon: <FileText className="h-4 w-4" />, label: "Documents" }
  };

  const getRecentTimeThreshold = () => {
    switch (recentTimeframe) {
      case "day":
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return oneDayAgo;
      case "month":
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return oneMonthAgo;
      case "week":
      default:
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return oneWeekAgo;
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFolder === "my-drive") return matchesSearch;
    if (activeFolder === "images") return file.type === "image" && matchesSearch;
    if (activeFolder === "documents") return file.type === "document" && matchesSearch;

    if (activeFolder === "recent") {
      const timeThreshold = getRecentTimeThreshold();
      if (recentSortBy === "modified") {
        return new Date(file.created_at) >= timeThreshold && matchesSearch;
      } else if (recentSortBy === "downloaded") {
        const activity = fileActivity[file.id];
        return activity && new Date(activity.lastDownloaded) >= timeThreshold && matchesSearch;
      } else {
        const activity = fileActivity[file.id];
        const wasCreatedRecently = new Date(file.created_at) >= timeThreshold;
        const wasViewedRecently = activity && new Date(activity.lastViewed) >= timeThreshold;
        return (wasCreatedRecently || wasViewedRecently) && matchesSearch;
      }
    }

    return matchesSearch;
  }).sort((a, b) => {
    if (activeFolder === "recent") {
      if (recentSortBy === "modified") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (recentSortBy === "downloaded") {
        const aDate = fileActivity[a.id]?.lastDownloaded ? new Date(fileActivity[a.id].lastDownloaded).getTime() : 0;
        const bDate = fileActivity[b.id]?.lastDownloaded ? new Date(fileActivity[b.id].lastDownloaded).getTime() : 0;
        return bDate - aDate;
      } else {
        const aDate = fileActivity[a.id]?.lastViewed ? new Date(fileActivity[a.id].lastViewed).getTime() :
                      new Date(a.created_at).getTime();
        const bDate = fileActivity[b.id]?.lastViewed ? new Date(fileActivity[b.id].lastViewed).getTime() :
                      new Date(b.created_at).getTime();
        return bDate - aDate;
      }
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-2 border-b bg-white sticky top-0 z-10">
        <h1 className="text-xl font-medium mr-8">Drive</h1>
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search in Drive"
              className="pl-9 bg-gray-50 border-0 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center ml-auto space-x-2">
          <FileDownload
            files={files}
            selectedFiles={selectedFiles}
            formatFileSize={formatFileSize}
            ref={fileDownloadRef}
          />
          {selectedFiles.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
              >
                Clear
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("list")}
            className={activeView === "list" ? "bg-gray-100" : ""}
          >
            <List className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("grid")}
            className={activeView === "grid" ? "bg-gray-100" : ""}
          >
            <Grid className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r overflow-y-auto p-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 my-2 w-full shadow-sm">
                <Plus size={16} /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogTitle>Upload File</DialogTitle>
              <FileUpload
                user={user}
                onUploadComplete={handleUploadComplete}
              />
            </DialogContent>
          </Dialog>
          <nav className="mt-4 space-y-1">
            {Object.entries(folderTypeMap).map(([key, { icon, label }]) => (
              <Button
                key={key}
                variant={activeFolder === key ? "secondary" : "ghost"}
                className="w-full justify-start text-sm font-normal h-9"
                onClick={() => setActiveFolder(key)}
              >
               <span className="mr-3" >{icon}</span>
               {label}
              </Button>
            ))}
          </nav>
          <div className="mt-6 px-3 pt-3 border-t">
            <div className="text-xs text-gray-500 mb-2">Storage</div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "15%" }}></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">{calculateUsedStorage()} of 15 GB used</div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium flex items-center">
                {folderTypeMap[activeFolder as keyof typeof folderTypeMap]?.icon}
                <span className="ml-2">{folderTypeMap[activeFolder as keyof typeof folderTypeMap]?.label}</span>
              </h2>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-52">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium">No files here</h3>
                <p className="text-sm mt-1">Upload files or create folders to see them here</p>
              </div>
            ) : activeView === "list" ? (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 bg-gray-50 border-b">
                      <th className="px-2 py-3 w-10">
                        <Checkbox
                          checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                          onCheckedChange={selectAllFiles}
                          aria-label="Select all files"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Modified</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50 border-b last:border-b-0">
                        <td className="px-2 py-3">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                            aria-label={`Select ${file.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 flex items-center">
                          <FileIcon type={file.type} />
                          <span className="ml-3 truncate max-w-xs">{file.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(file.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownloadFile(file.id, file.url, file.name)}>
                                <Download className="h-4 w-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFile(file.id, file.path)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : activeFolder === "recent" ? (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Show:</span>
                  <Select
                    value={recentTimeframe}
                    onValueChange={(value) => setRecentTimeframe(value as "day" | "week" | "month")}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="day">Past 24 hours</SelectItem>
                        <SelectItem value="week">Past week</SelectItem>
                        <SelectItem value="month">Past month</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Sort by:</span>
                  <Select
                    value={recentSortBy}
                    onValueChange={(value) => setRecentSortBy(value as "accessed" | "modified" | "downloaded")}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select sort method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="accessed">Last accessed</SelectItem>
                        <SelectItem value="modified">Last modified</SelectItem>
                        <SelectItem value="downloaded">Last downloaded</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white group">
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        aria-label={`Select ${file.name}`}
                        className="opacity-70 group-hover:opacity-100"
                      />
                    </div>
                    <div className="p-4 flex justify-center items-center h-32 bg-gray-50 border-b">
                      <FileIcon type={file.type} />
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-medium">{file.name}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadFile(file.id, file.url, file.name)}>
                              <Download className="h-4 w-4 mr-2" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFile(file.id, file.path)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Delete Dialog */}
      <FileDelete
        filesToDelete={filesToDelete}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
}