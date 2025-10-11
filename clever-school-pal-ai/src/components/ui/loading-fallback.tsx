import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingFallbackProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingFallback({ 
  className, 
  size = "md", 
  text = "Loading...",
  fullScreen = false 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        {text && (
          <p className="text-sm text-muted-foreground font-medium">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Specialized loading components for common use cases
export function PageLoadingFallback() {
  return <LoadingFallback fullScreen text="Loading page..." size="lg" />;
}

export function ComponentLoadingFallback() {
  return <LoadingFallback text="Loading..." size="md" />;
}

export function ButtonLoadingFallback() {
  return <LoadingFallback text="" size="sm" className="p-2" />;
} 