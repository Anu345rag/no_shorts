import VideoCard from "./VideoCard";
import { Video } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoGridProps {
  videos: Video[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const VideoGrid = ({ videos, isLoading = false, emptyMessage = "No videos found" }: VideoGridProps) => {
  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="w-full aspect-video rounded-lg" />
            <div className="flex space-x-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Show empty state when no videos
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-gray-500 mt-4">{emptyMessage}</p>
      </div>
    );
  }
  
  // Show videos grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};

export default VideoGrid;
