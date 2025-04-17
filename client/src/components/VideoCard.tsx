import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Video } from "@shared/schema";
import { formatViewCount, formatPublishDate, formatDuration, parseDuration } from "@/lib/youtube";

interface VideoCardProps {
  video: Video;
}

const VideoCard = ({ video }: VideoCardProps) => {
  const [, navigate] = useLocation();
  
  const handleClick = () => {
    navigate(`/watch/${video.id}`);
  };
  
  // Calculate the duration in seconds
  const durationSeconds = video.duration ? parseDuration(video.duration) : 0;
  
  // Format the duration for display (e.g., "10:30")
  const formattedDuration = formatDuration(durationSeconds);
  
  // Format the view count (e.g., "1.2M views")
  const formattedViewCount = video.viewCount 
    ? `${formatViewCount(video.viewCount)} views` 
    : "";
  
  // Format the published date (e.g., "2 years ago")
  const formattedPublished = video.publishedAt 
    ? formatPublishDate(video.publishedAt.toString()) 
    : "";
  
  return (
    <Card className="video-card border-none shadow-none bg-transparent" onClick={handleClick}>
      <div className="relative cursor-pointer">
        <img 
          src={video.thumbnailUrl || ""}
          alt={video.title}
          className="w-full rounded-lg aspect-video object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
          {formattedDuration}
        </div>
      </div>
      <div className="flex mt-3">
        <div>
          <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
          <p className="text-gray-600 text-xs mt-1">{video.channelTitle}</p>
          <p className="text-gray-600 text-xs">
            {formattedViewCount} • {formattedPublished}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default VideoCard;
