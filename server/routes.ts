import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertVideoSchema,
  insertChannelSchema,
  insertCategorySchema,
  insertSearchQuerySchema,
  insertUserPreferenceSchema,
  filterSchema,
  Video,
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import fetch from "node-fetch";
import { YOUTUBE_API_BASE_URL, YOUTUBE_API_KEY, MIN_SHORT_DURATION } from "./youtube-config";
import { setupAuth } from "./auth";

// Helper function to handle API errors
function handleApiError(error: unknown): { message: string; status?: number } {
  if (error instanceof ZodError) {
    return { message: fromZodError(error).message, status: 400 };
  }
  if (error instanceof Error) {
    return { message: error.message, status: 500 };
  }
  return { message: "An unknown error occurred", status: 500 };
}

// Helper function to check if a video is likely a Short
function isLikelyShort(video: any): boolean {
  // Check duration (if available)
  if (video.contentDetails?.duration) {
    const durationMatch = video.contentDetails.duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (durationMatch && durationMatch[1]) ? parseInt(durationMatch[1].replace('H', '')) : 0;
    const minutes = (durationMatch && durationMatch[2]) ? parseInt(durationMatch[2].replace('M', '')) : 0;
    const seconds = (durationMatch && durationMatch[3]) ? parseInt(durationMatch[3].replace('S', '')) : 0;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= MIN_SHORT_DURATION) {
      return true;
    }
  }
  
  // Check title or description for #shorts hashtag
  const title = video.snippet?.title?.toLowerCase() || "";
  const description = video.snippet?.description?.toLowerCase() || "";
  
  if (title.includes("#shorts") || title.includes("#short") || 
      description.includes("#shorts") || description.includes("#short")) {
    return true;
  }
  
  return false;
}

// Helper function to convert YouTube API video to our Video type
function convertToVideo(ytVideo: any): Video {
  const thumbnails = ytVideo.snippet?.thumbnails || {};
  let bestThumbnail = thumbnails.maxres?.url || 
                     thumbnails.standard?.url || 
                     thumbnails.high?.url || 
                     thumbnails.medium?.url || 
                     thumbnails.default?.url;
  
  return {
    id: ytVideo.id || ytVideo.id?.videoId,
    title: ytVideo.snippet?.title || "",
    description: ytVideo.snippet?.description || "",
    thumbnailUrl: bestThumbnail,
    channelId: ytVideo.snippet?.channelId || "",
    channelTitle: ytVideo.snippet?.channelTitle || "",
    publishedAt: ytVideo.snippet?.publishedAt || null,
    duration: ytVideo.contentDetails?.duration || "",
    viewCount: ytVideo.statistics?.viewCount ? parseInt(ytVideo.statistics.viewCount) : 0,
    isShort: isLikelyShort(ytVideo),
  };
}

// Fetch videos from YouTube API
async function fetchYouTubeVideos(url: string): Promise<Video[]> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    
    const data: any = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }
    
    // Convert YouTube API response to our Video type
    return data.items.map((item: any) => convertToVideo(item));
  } catch (error) {
    console.error("Error fetching videos from YouTube:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up authentication
  setupAuth(app);
  
  // API routes for videos
  
  // Get trending videos
  app.get("/api/videos/trending", async (req, res) => {
    try {
      const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=24&key=${YOUTUBE_API_KEY}`;
      const videos = await fetchYouTubeVideos(url);
      
      // Save videos to storage
      for (const video of videos) {
        await storage.saveVideo(video);
      }
      
      res.json(videos);
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get video by ID
  app.get("/api/videos/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      
      // Try to get from cache first
      let video = await storage.getVideoById(videoId);
      
      // If not in cache, fetch from YouTube
      if (!video) {
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const videos = await fetchYouTubeVideos(url);
        
        if (videos.length === 0) {
          return res.status(404).json({ message: "Video not found" });
        }
        
        video = videos[0];
        await storage.saveVideo(video);
      }
      
      res.json(video);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get related videos
  app.get("/api/videos/:videoId/related", async (req, res) => {
    try {
      const { videoId } = req.params;
      
      // Try to get video first to get its topic/category
      const video = await storage.getVideoById(videoId);
      let relatedVideos: Video[] = [];
      
      if (video && video.channelId) {
        // First try to get videos from same channel
        const channelUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${video.channelId}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`;
        const channelVideos = await fetchYouTubeVideos(channelUrl);
        
        // Filter out the current video
        relatedVideos = channelVideos.filter(v => v.id !== videoId);
      }
      
      // If we don't have enough related videos, fetch more based on search
      if (relatedVideos.length < 10 && video) {
        const searchTerms = video.title.split(' ').slice(0, 3).join(' ');
        const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchTerms)}&type=video&maxResults=${15 - relatedVideos.length}&key=${YOUTUBE_API_KEY}`;
        const searchVideos = await fetchYouTubeVideos(searchUrl);
        
        // Filter out the current video and any duplicates
        const existingIds = new Set(relatedVideos.map(v => v.id));
        const additionalVideos = searchVideos.filter(v => v.id !== videoId && !existingIds.has(v.id));
        
        relatedVideos = [...relatedVideos, ...additionalVideos];
      }
      
      // Save videos to storage
      for (const video of relatedVideos) {
        await storage.saveVideo(video);
      }
      
      res.json(relatedVideos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get videos by category
  app.get("/api/videos/category/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      let videos: Video[] = [];
      
      if (categoryId === "trending") {
        // Get trending videos
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=24&key=${YOUTUBE_API_KEY}`;
        videos = await fetchYouTubeVideos(url);
      } else if (categoryId === "popular") {
        // Get popular videos (using viewCount)
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=24&key=${YOUTUBE_API_KEY}`;
        videos = await fetchYouTubeVideos(url);
      } else {
        // Get videos by category ID
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=${categoryId}&maxResults=24&key=${YOUTUBE_API_KEY}`;
        videos = await fetchYouTubeVideos(url);
      }
      
      // Save videos to storage
      for (const video of videos) {
        await storage.saveVideo(video);
      }
      
      res.json(videos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Search for videos
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      // Save search query
      await storage.saveSearchQuery({ query });
      
      // Get videos from YouTube search
      const url = `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&key=${YOUTUBE_API_KEY}`;
      const searchResults = await fetchYouTubeVideos(url);
      
      // For each search result, fetch the full video details to get duration, etc.
      const videoIds = searchResults.map(video => video.id).join(',');
      const videoDetailsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const detailedVideos = await fetchYouTubeVideos(videoDetailsUrl);
      
      // Create a map of id -> detailed video
      const detailedVideoMap = new Map<string, Video>();
      for (const video of detailedVideos) {
        detailedVideoMap.set(video.id, video);
      }
      
      // Merge search results with detailed video info
      const mergedVideos = searchResults.map(searchVideo => {
        const detailedVideo = detailedVideoMap.get(searchVideo.id);
        return detailedVideo || searchVideo;
      });
      
      // Save videos to storage
      for (const video of mergedVideos) {
        await storage.saveVideo(video);
      }
      
      res.json(mergedVideos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get video categories
  app.get("/api/categories", async (req, res) => {
    try {
      // First, get cached categories
      const cachedCategories = await storage.getAllCategories();
      
      if (cachedCategories.length > 0) {
        return res.json(cachedCategories);
      }
      
      // If no cached categories, fetch from YouTube
      const url = `${YOUTUBE_API_BASE_URL}/videoCategories?part=snippet&regionCode=US&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return res.json([]);
      }
      
      // Convert and save categories
      const categories = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
      }));
      
      // Save each category
      for (const category of categories) {
        await storage.saveCategory(category);
      }
      
      res.json(categories);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get user preferences
  app.get("/api/preferences", async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences();
      res.json(preferences);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Update user preferences
  app.post("/api/preferences", async (req, res) => {
    try {
      const preferences = filterSchema.parse(req.body);
      const updatedPreferences = await storage.saveUserPreferences(preferences);
      res.json(updatedPreferences);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Watch History API Endpoints
  
  // Save watch history
  app.post("/api/watch-history", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const history = {
        userId,
        videoId: req.body.videoId,
        watchDuration: req.body.watchDuration,
        completed: req.body.completed,
      };
      
      const watchHistory = await storage.saveWatchHistory(history);
      res.status(201).json(watchHistory);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get watch history for the authenticated user
  app.get("/api/watch-history", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const watchHistory = await storage.getWatchHistoryByUser(userId, limit);
      
      // Get the full video details for each history item
      const videoPromises = watchHistory.map(async (history) => {
        const video = await storage.getVideoById(history.videoId);
        return {
          ...history,
          video,
        };
      });
      
      const watchHistoryWithVideos = await Promise.all(videoPromises);
      res.json(watchHistoryWithVideos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // API endpoint for trending videos (used for recommendations)
  app.get("/api/videos/trending", async (req, res) => {
    try {
      // Fetch trending videos from YouTube API
      const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=50&regionCode=US&key=${YOUTUBE_API_KEY}`;
      
      const videos = await fetchYouTubeVideos(url);
      res.json(videos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // API endpoint for personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        // Return trending videos for non-authenticated users
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=50&regionCode=US&key=${YOUTUBE_API_KEY}`;
        const videos = await fetchYouTubeVideos(url);
        return res.json(videos);
      }
      
      const userId = req.user.id;
      
      // STEP 1: Get user's watch history and likes
      const watchHistory = await storage.getWatchHistoryByUser(userId, 50);
      const likedVideos = await storage.getVideoLikes(userId);
      
      // STEP 2: Extract patterns (channels, categories) from watch history and likes
      const channelWeights = new Map<string, number>();
      const categoryWeights = new Map<string, number>();
      const watchedVideoIds = new Set<string>();
      
      // Process watch history (lower weight)
      for (const entry of watchHistory) {
        const video = await storage.getVideoById(entry.videoId);
        if (!video) continue;
        
        watchedVideoIds.add(video.id);
        
        // Channel weighting
        if (video.channelId) {
          const currentWeight = channelWeights.get(video.channelId) || 0;
          channelWeights.set(video.channelId, currentWeight + 1);
        }
      }
      
      // Process liked videos (higher weight)
      for (const like of likedVideos) {
        const video = await storage.getVideoById(like.videoId);
        if (!video) continue;
        
        // Channel weighting (likes count more)
        if (video.channelId) {
          const currentWeight = channelWeights.get(video.channelId) || 0;
          channelWeights.set(video.channelId, currentWeight + 3);
        }
      }
      
      // STEP 3: Get top channels/categories to fetch related content
      const weightEntries: [string, number][] = [];
      channelWeights.forEach((weight, channelId) => {
        weightEntries.push([channelId, weight]);
      });
      
      const topChannels = weightEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
      
      // STEP 4: Fetch related videos
      const recommendedVideos: Video[] = [];
      
      // Try to get videos from top channels
      if (topChannels.length > 0) {
        for (const channelId of topChannels) {
          try {
            const url = `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            const data: any = await response.json();
            
            if (data.items && data.items.length > 0) {
              // Get full video details
              const videoIds = data.items
                .filter((item: any) => item.id && item.id.videoId)
                .map((item: any) => item.id.videoId)
                .join(',');
                
              if (videoIds) {
                const videoUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
                const channelVideos = await fetchYouTubeVideos(videoUrl);
                
                // Filter out already watched videos and add to recommendations
                for (const video of channelVideos) {
                  if (!watchedVideoIds.has(video.id)) {
                    recommendedVideos.push(video);
                  }
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching videos for channel ${channelId}:`, err);
          }
        }
      }
      
      // If we don't have enough recommendations, add trending videos
      if (recommendedVideos.length < 20) {
        const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=${30 - recommendedVideos.length}&regionCode=US&key=${YOUTUBE_API_KEY}`;
        const trendingVideos = await fetchYouTubeVideos(url);
        
        // Add only unwatched trending videos
        for (const video of trendingVideos) {
          if (!watchedVideoIds.has(video.id)) {
            recommendedVideos.push(video);
          }
        }
      }
      
      res.json(recommendedVideos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });

  // API endpoint for category-based videos
  app.get("/api/videos/category/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      // Handle special categories
      let url;
      if (categoryId === 'trending') {
        url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=50&regionCode=US&key=${YOUTUBE_API_KEY}`;
      } else if (categoryId === 'popular') {
        url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=50&regionCode=US&key=${YOUTUBE_API_KEY}`;
      } else {
        url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=50&videoCategoryId=${categoryId}&regionCode=US&key=${YOUTUBE_API_KEY}`;
      }
      
      const videos = await fetchYouTubeVideos(url);
      res.json(videos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });

  // Video Interactions API Endpoints
  
  // Save video interaction (like, dislike, save, etc.)
  app.post("/api/video-interactions", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const interaction = {
        userId,
        videoId: req.body.videoId,
        interactionType: req.body.interactionType,
      };
      
      const videoInteraction = await storage.saveVideoInteraction(interaction);
      res.status(201).json(videoInteraction);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });
  
  // Get video interactions for authenticated user
  app.get("/api/video-interactions", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const videoId = req.query.videoId as string | undefined;
      const type = req.query.type as string | undefined;
      
      let interactions;
      
      if (type) {
        interactions = await storage.getVideoInteractionsByType(userId, type);
      } else {
        interactions = await storage.getVideoInteractions(userId, videoId);
      }
      
      // Get the full video details for each interaction
      const interactionsWithVideos = await Promise.all(
        interactions.map(async (interaction) => {
          const video = await storage.getVideoById(interaction.videoId);
          return {
            ...interaction,
            video,
          };
        })
      );
      
      res.json(interactionsWithVideos);
    } catch (error) {
      const { message, status = 500 } = handleApiError(error);
      res.status(status).json({ message });
    }
  });

  return httpServer;
}
