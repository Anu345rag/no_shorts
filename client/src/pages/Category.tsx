import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect } from "react";
import { useFilter } from "@/contexts/FilterContext";
import CategoryChips from "@/components/CategoryChips";
import VideoGrid from "@/components/VideoGrid";
import { Video } from "@shared/schema";
import { applyFilters } from "@/lib/youtube";

const Category = () => {
  const { categoryId } = useParams();
  const { filter } = useFilter();
  
  // Map special categories to readable names
  const categoryNames: Record<string, string> = {
    "trending": "Trending",
    "popular": "Popular",
    "10": "Music",
    "20": "Gaming",
    "25": "News",
    "17": "Sports",
    "27": "Education",
    // Add more mappings as needed
  };
  
  const categoryName = categoryNames[categoryId] || categoryId;
  
  // Fetch category videos
  const { 
    data: videos, 
    isLoading, 
    refetch 
  } = useQuery<Video[]>({
    queryKey: [`/api/videos/category/${categoryId}`],
    enabled: !!categoryId,
  });
  
  // Re-fetch when filters change
  useEffect(() => {
    refetch();
  }, [filter, refetch]);
  
  // Apply filters
  const filteredVideos = videos ? applyFilters(videos, filter) : [];
  
  return (
    <main className="flex-1 overflow-y-auto p-4">
      <CategoryChips />
      
      <div className="flex items-center mb-4">
        <div className="bg-[#FF0000] text-white rounded-md px-1.5 py-0.5 text-xs font-medium mr-2">
          NO SHORTS
        </div>
        <h2 className="text-lg font-medium">
          {categoryName} videos
        </h2>
      </div>
      
      <VideoGrid 
        videos={filteredVideos} 
        isLoading={isLoading} 
        emptyMessage={`No ${categoryName.toLowerCase()} videos found. Try adjusting your filters.`}
      />
    </main>
  );
};

export default Category;
