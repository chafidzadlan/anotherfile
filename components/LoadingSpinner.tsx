import { Loader2 } from "lucide-react";

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

export default LoadingSpinner;