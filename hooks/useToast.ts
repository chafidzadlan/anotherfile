import { useToast } from "@/components/ui/toast-provider";

/**
 * Hook for showing toast notifications with predefined templates
 */
export function useToasts() {
  const { addToast } = useToast();

  return {
    /**
     * Show a success toast notification
     */
    success: (title: string, description?: string, duration: number = 5000) => {
      addToast({
        title,
        description,
        variant: "success",
        duration,
      });
    },

    /**
     * Show an error toast notification
     */
    error: (title: string, description?: string, duration: number = 5000) => {
      addToast({
        title,
        description,
        variant: "destructive",
        duration,
      });
    },

    /**
     * Show a default/info toast notification
     */
    info: (title: string, description?: string, duration: number = 5000) => {
      addToast({
        title,
        description,
        variant: "default",
        duration,
      });
    },
  };
}