import { YOUTUBE_API, MIN_SHORT_DURATION } from "./config";
import { 
  YouTubeVideo, 
  YouTubeSearchResult, 
  YouTubeChannel, 
  Video, 
  Filter 
} from "@shared/schema";

// Parse ISO 8601 duration to seconds
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match && match[1]) ? parseInt(match[1].replace('H', '')) : 0;
  const minutes = (match && match[2]) ? parseInt(match[2].replace('M', '')) : 0;
  const seconds = (match && match[3]) ? parseInt(match[3].replace('S', '')) : 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Format view count
export function formatViewCount(count: string | number): string {
  const num = typeof count === 'string' ? parseInt(count) : count;
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format publish date
export function formatPublishDate(dateString: string): string {
  const published = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffMonth / 12);

  if (diffYear > 0) {
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  } else if (diffMonth > 0) {
    return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Detect if a video is likely a Short based on duration and/or other factors
export function isShort(video: Partial<Video>): boolean {
  // If we have the duration, check if it's short
  if (video.duration) {
    const durationSeconds = typeof video.duration === 'string' 
      ? parseDuration(video.duration) 
      : video.duration;
    
    if (durationSeconds <= MIN_SHORT_DURATION) {
      return true;
    }
  }
  
  // If we have the title, check for #shorts hashtag
  if (video.title && 
      (video.title.toLowerCase().includes('#shorts') || 
       video.title.toLowerCase().includes('#short'))) {
    return true;
  }
  
  // Check description for #shorts hashtag if available
  if (video.description && 
      (video.description.toLowerCase().includes('#shorts') || 
       video.description.toLowerCase().includes('#short'))) {
    return true;
  }
  
  return false;
}

// Apply filters to a list of videos
export function applyFilters(videos: Video[], filters: Filter): Video[] {
  return videos.filter(video => {
    // Filter out shorts if requested
    if (filters.excludeShorts && video.isShort) {
      return false;
    }
    
    // Filter based on minimum duration
    if (filters.minDuration > 0 && video.duration) {
      const durationSeconds = typeof video.duration === 'string'
        ? parseDuration(video.duration)
        : video.duration;
      
      if (durationSeconds < filters.minDuration * 60) { // Convert to seconds
        return false;
      }
    }
    
    return true;
  });
}

// Get video thumbnail with fallbacks
export function getBestThumbnail(thumbnails: YouTubeVideo['snippet']['thumbnails'] | 
                                 YouTubeSearchResult['snippet']['thumbnails'] | 
                                 YouTubeChannel['snippet']['thumbnails']): string {
  // Try to get the best quality thumbnail available
  if (thumbnails.maxres) return thumbnails.maxres.url;
  if (thumbnails.standard) return thumbnails.standard.url;
  if (thumbnails.high) return thumbnails.high.url;
  if (thumbnails.medium) return thumbnails.medium.url;
  return thumbnails.default.url;
}
