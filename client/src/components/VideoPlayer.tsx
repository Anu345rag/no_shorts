import { useState, useEffect, useRef } from "react";
import { formatViewCount, formatPublishDate } from "@/lib/youtube";
import { YOUTUBE_API } from "@/lib/config";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share, 
  Bookmark,
  MessageCircle,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video } from "@shared/schema";
import { useVideoInteractions } from "@/hooks/use-video-interactions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  video: Video;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isDialogMode?: boolean;
}

const VideoPlayer = ({ 
  video, 
  open = true, 
  onOpenChange,
  isDialogMode = false 
}: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const { user } = useAuth();
  const { 
    recordWatchHistory, 
    toggleLike, 
    toggleSave, 
    isVideoLiked, 
    isVideoSaved,
    videoInteractionMutation 
  } = useVideoInteractions();
  
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [watchDuration, setWatchDuration] = useState(0);
  
  // Format view count and published date
  const formattedViewCount = video.viewCount 
    ? formatViewCount(video.viewCount) 
    : "0";

  const formattedPublished = video.publishedAt 
    ? formatPublishDate(video.publishedAt.toString()) 
    : "";
  
  const embedUrl = `${YOUTUBE_API.EMBED_URL}/${video.id}?autoplay=1&rel=0`;
  
  // Track the video view when component mounts
  useEffect(() => {
    if (user) {
      // Record that the user started watching this video
      recordWatchHistory(video.id, 0, false);
      // Set the watch start time
      setWatchStartTime(Date.now());
    }
    
    // Record watch duration when component unmounts
    return () => {
      if (user && watchStartTime) {
        const duration = Math.floor((Date.now() - watchStartTime) / 1000); // in seconds
        recordWatchHistory(video.id, duration, duration > 30); // Mark as completed if watched for more than 30 seconds
      }
    };
  }, [user, video.id]);
  
  const PlayerContent = () => (
    <>
      <div className="aspect-video bg-black relative">
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-medium text-xl">{video.title}</h1>
            <p className="text-gray-600 text-sm">{formattedViewCount} views • {formattedPublished}</p>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              variant={isVideoLiked(video.id) ? "default" : "outline"} 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => toggleLike(video.id)}
              disabled={!user || videoInteractionMutation.isPending}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Like</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              disabled={!user}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>Dislike</span>
            </Button>
            
            <Button 
              variant={isVideoSaved(video.id) ? "default" : "outline"}
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => toggleSave(video.id)}
              disabled={!user || videoInteractionMutation.isPending}
            >
              <Bookmark className="h-4 w-4" />
              <span>Save</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: video.title,
                    text: video.description || 'Check out this video!',
                    url: `https://youtube.com/watch?v=${video.id}`
                  });
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(`https://youtube.com/watch?v=${video.id}`);
                  alert('Link copied to clipboard!');
                }
              }}
            >
              <Share className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-start border-t border-b py-4 border-gray-200">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-medium">{video.channelTitle}</h2>
            <p className="mt-2 text-sm text-gray-700">{video.description}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2">Comments</h3>
          <div className="flex items-center p-4 text-gray-500 justify-center border border-gray-200 rounded-lg">
            <MessageCircle className="h-5 w-5 mr-2" />
            <p>Comments are disabled to focus on video content</p>
          </div>
        </div>
      </div>
    </>
  );
  
  // If in dialog mode, render in a Dialog component
  if (isDialogMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{video.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <PlayerContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Otherwise, render directly
  return <PlayerContent />;
};

export default VideoPlayer;
