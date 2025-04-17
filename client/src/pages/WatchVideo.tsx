import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import VideoPlayer from "@/components/VideoPlayer";
import VideoGrid from "@/components/VideoGrid";
import { Video } from "@shared/schema";
import { useFilter } from "@/contexts/FilterContext";
import { applyFilters } from "@/lib/youtube";
import { Skeleton } from "@/components/ui/skeleton";

const WatchVideo = () => {
  const { videoId } = useParams();
  const { filter } = useFilter();
  
  // Fetch the video
  const { 
    data: video, 
    isLoading: isVideoLoading,
    error: videoError
  } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: !!videoId,
  });
  
  // Fetch related videos
  const { 
    data: relatedVideos, 
    isLoading: isRelatedLoading 
  } = useQuery<Video[]>({
    queryKey: [`/api/videos/${videoId}/related`],
    enabled: !!videoId,
  });
  
  // Apply filters to related videos
  const filteredRelatedVideos = relatedVideos ? applyFilters(relatedVideos, filter) : [];
  
  // Loading state
  if (isVideoLoading) {
    return (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-24 w-40 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (videoError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-red-500">Error loading video: {(videoError as Error).message}</p>
      </div>
    );
  }
  
  // If no video found
  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-gray-500">Video not found</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 overflow-y-auto">
      <div className="lg:col-span-2">
        <VideoPlayer video={video} isDialogMode={false} />
      </div>
      
      <div>
        <h3 className="font-medium mb-4">Related Videos</h3>
        <div className="space-y-4">
          {filteredRelatedVideos.map((relatedVideo) => (
            <div key={relatedVideo.id} className="flex gap-2">
              <img 
                src={relatedVideo.thumbnailUrl || ""} 
                alt={relatedVideo.title}
                className="h-24 w-40 object-cover rounded-lg"
              />
              <div>
                <h4 className="text-sm font-medium line-clamp-2">{relatedVideo.title}</h4>
                <p className="text-xs text-gray-600">{relatedVideo.channelTitle}</p>
              </div>
            </div>
          ))}
          
          {isRelatedLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-24 w-40 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!isRelatedLoading && filteredRelatedVideos.length === 0 && (
            <p className="text-center text-gray-500 p-4">No related videos found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchVideo;
