import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Video, WatchHistory, VideoInteraction } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// Type for watch history items with video data
export type WatchHistoryWithVideo = WatchHistory & {
  video: Video;
};

// Type for video interactions with video data
export type VideoInteractionWithVideo = VideoInteraction & {
  video: Video;
};

export function useVideoInteractions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Get user's watch history
  const {
    data: watchHistory,
    isLoading: isWatchHistoryLoading,
    error: watchHistoryError,
  } = useQuery<WatchHistoryWithVideo[]>({
    queryKey: ["/api/watch-history"],
    enabled: isAuthenticated,
  });

  // Get user's liked videos
  const {
    data: likedVideos,
    isLoading: isLikedVideosLoading,
    error: likedVideosError,
  } = useQuery<VideoInteractionWithVideo[]>({
    queryKey: ["/api/video-interactions", { type: "like" }],
    enabled: isAuthenticated,
  });

  // Get user's saved videos
  const {
    data: savedVideos,
    isLoading: isSavedVideosLoading,
    error: savedVideosError,
  } = useQuery<VideoInteractionWithVideo[]>({
    queryKey: ["/api/video-interactions", { type: "save" }],
    enabled: isAuthenticated,
  });

  // Save watch history
  const recordWatchHistoryMutation = useMutation({
    mutationFn: async (data: { videoId: string; watchDuration?: number; completed?: boolean }) => {
      const res = await apiRequest("POST", "/api/watch-history", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watch-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error recording watch history",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle video interactions (like, dislike, save)
  const videoInteractionMutation = useMutation({
    mutationFn: async (data: { videoId: string; interactionType: string }) => {
      const res = await apiRequest("POST", "/api/video-interactions", data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific interaction type query as well as all interactions
      queryClient.invalidateQueries({ 
        queryKey: ["/api/video-interactions", { type: variables.interactionType }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/video-interactions"] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving interaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if a video is liked
  const isVideoLiked = (videoId: string): boolean => {
    if (!likedVideos) return false;
    return likedVideos.some(interaction => interaction.videoId === videoId);
  };

  // Check if a video is saved
  const isVideoSaved = (videoId: string): boolean => {
    if (!savedVideos) return false;
    return savedVideos.some(interaction => interaction.videoId === videoId);
  };

  // Record that a user has watched a video
  const recordWatchHistory = (videoId: string, watchDuration?: number, completed?: boolean) => {
    if (!isAuthenticated) return;
    recordWatchHistoryMutation.mutate({ videoId, watchDuration, completed });
  };

  // Handle like/unlike toggle
  const toggleLike = (videoId: string) => {
    if (!isAuthenticated) return;
    videoInteractionMutation.mutate({ videoId, interactionType: "like" });
  };

  // Handle save/unsave toggle
  const toggleSave = (videoId: string) => {
    if (!isAuthenticated) return;
    videoInteractionMutation.mutate({ videoId, interactionType: "save" });
  };

  return {
    watchHistory,
    isWatchHistoryLoading,
    watchHistoryError,
    likedVideos,
    isLikedVideosLoading,
    likedVideosError,
    savedVideos,
    isSavedVideosLoading,
    savedVideosError,
    recordWatchHistory,
    toggleLike,
    toggleSave,
    isVideoLiked,
    isVideoSaved,
    recordWatchHistoryMutation,
    videoInteractionMutation,
  };
}