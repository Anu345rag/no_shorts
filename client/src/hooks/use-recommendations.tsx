import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Video } from "@shared/schema";
import { useFilter } from "@/contexts/FilterContext";
import { applyFilters } from "@/lib/youtube";

export function useRecommendations() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { filter } = useFilter();
  
  // Fetch personalized recommendations from the backend
  const {
    data: recommendationsData,
    isLoading: isRecommendationsLoading,
    error: recommendationsError,
  } = useQuery<Video[]>({
    queryKey: ["/api/recommendations"],
  });
  
  // Fetch trending videos
  const {
    data: trendingVideos,
    isLoading: isTrendingVideosLoading,
    error: trendingVideosError,
  } = useQuery<Video[]>({
    queryKey: ["/api/videos/trending"],
    // Only fetch trending if recommendations failed
    enabled: !!recommendationsError,
  });

  // Fetch videos by category - helpful utility function
  const fetchVideosByCategory = (categoryId: string) => {
    return useQuery<Video[]>({
      queryKey: ["/api/videos/category", categoryId],
      enabled: !!categoryId,
    });
  };
  
  // Apply filters to the recommendations
  const recommendedVideos = recommendationsData 
    ? applyFilters(recommendationsData, filter)
    : (trendingVideos ? applyFilters(trendingVideos, filter) : []);

  return {
    recommendedVideos,
    isLoading: isRecommendationsLoading || isTrendingVideosLoading,
    error: recommendationsError || trendingVideosError,
    fetchVideosByCategory,
  };
}