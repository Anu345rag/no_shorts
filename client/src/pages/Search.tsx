import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect } from "react";
import { useFilter } from "@/contexts/FilterContext";
import CategoryChips from "@/components/CategoryChips";
import VideoGrid from "@/components/VideoGrid";
import { Video } from "@shared/schema";
import { applyFilters } from "@/lib/youtube";

const Search = () => {
  const { query } = useParams();
  const { filter } = useFilter();
  
  const decodedQuery = decodeURIComponent(query);
  
  // Fetch search results
  const { 
    data: videos, 
    isLoading, 
    refetch 
  } = useQuery<Video[]>({
    queryKey: [`/api/search?q=${decodedQuery}`],
    enabled: !!decodedQuery,
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
          Search results for "{decodedQuery}"
        </h2>
      </div>
      
      <VideoGrid 
        videos={filteredVideos} 
        isLoading={isLoading} 
        emptyMessage={`No videos found for "${decodedQuery}". Try adjusting your filters or search terms.`}
      />
    </main>
  );
};

export default Search;
