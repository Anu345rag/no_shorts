import {
  Video,
  InsertVideo,
  Channel,
  InsertChannel,
  Category,
  InsertCategory,
  SearchQuery,
  InsertSearchQuery,
  UserPreference,
  InsertUserPreference,
  Filter,
  User,
  InsertUser,
  WatchHistory,
  InsertWatchHistory,
  VideoInteraction,
  InsertVideoInteraction
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create a memory store for sessions
const MemoryStore = createMemoryStore(session);

// Add YouTube API configuration
export const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
export const MIN_SHORT_DURATION = 60; // videos under 60 seconds are likely shorts

export interface IStorage {
  // Video operations
  getVideoById(id: string): Promise<Video | undefined>;
  saveVideo(video: Video): Promise<Video>;
  getVideos(limit?: number): Promise<Video[]>;
  
  // Channel operations
  getChannelById(id: string): Promise<Channel | undefined>;
  saveChannel(channel: Channel): Promise<Channel>;
  
  // Category operations
  getCategoryById(id: string): Promise<Category | undefined>;
  saveCategory(category: Category): Promise<Category>;
  getAllCategories(): Promise<Category[]>;
  
  // Search query operations
  saveSearchQuery(query: InsertSearchQuery): Promise<SearchQuery>;
  getRecentSearchQueries(limit?: number): Promise<SearchQuery[]>;
  
  // User preferences operations
  getUserPreferences(): Promise<UserPreference>;
  saveUserPreferences(preferences: Filter): Promise<UserPreference>;
  
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Watch history operations
  saveWatchHistory(history: InsertWatchHistory): Promise<WatchHistory>;
  getWatchHistoryByUser(userId: number, limit?: number): Promise<WatchHistory[]>;
  getWatchHistoryByVideo(videoId: string, limit?: number): Promise<WatchHistory[]>;
  
  // Video interaction operations
  saveVideoInteraction(interaction: InsertVideoInteraction): Promise<VideoInteraction>;
  getVideoInteractions(userId: number, videoId?: string): Promise<VideoInteraction[]>;
  getVideoInteractionsByType(userId: number, type: string): Promise<VideoInteraction[]>;
  getVideoLikes(userId: number): Promise<VideoInteraction[]>;
  
  // Session management
  sessionStore: any; // Will be either MemoryStore or PostgresStore
}

export class MemStorage implements IStorage {
  // In-memory storage
  private videos: Map<string, Video>;
  private channels: Map<string, Channel>;
  private categories: Map<string, Category>;
  private searchQueries: SearchQuery[];
  private userPreferences: UserPreference;
  private users: Map<number, User>;
  private usernameToId: Map<string, number>;
  private watchHistory: WatchHistory[] = [];
  private videoInteractions: VideoInteraction[] = [];
  private currentId: number;
  sessionStore: session.Store;
  
  constructor() {
    this.videos = new Map();
    this.channels = new Map();
    this.categories = new Map();
    this.searchQueries = [];
    this.users = new Map();
    this.usernameToId = new Map();
    this.watchHistory = [];
    this.videoInteractions = [];
    this.currentId = 1;
    
    // Default user preferences
    this.userPreferences = {
      id: 1,
      excludeShorts: true,
      excludeVertical: false,
      minDuration: 0,
    };
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
  
  // Video operations
  async getVideoById(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }
  
  async saveVideo(video: Video): Promise<Video> {
    this.videos.set(video.id, video);
    return video;
  }
  
  async getVideos(limit: number = 50): Promise<Video[]> {
    return Array.from(this.videos.values())
      .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))
      .slice(0, limit);
  }
  
  // Channel operations
  async getChannelById(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }
  
  async saveChannel(channel: Channel): Promise<Channel> {
    this.channels.set(channel.id, channel);
    return channel;
  }
  
  // Category operations
  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async saveCategory(category: Category): Promise<Category> {
    this.categories.set(category.id, category);
    return category;
  }
  
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  // Search query operations
  async saveSearchQuery(query: InsertSearchQuery): Promise<SearchQuery> {
    const searchQuery: SearchQuery = {
      id: this.currentId++,
      query: query.query,
      timestamp: new Date(),
    };
    
    this.searchQueries.push(searchQuery);
    return searchQuery;
  }
  
  async getRecentSearchQueries(limit: number = 10): Promise<SearchQuery[]> {
    return this.searchQueries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // User preferences operations
  async getUserPreferences(): Promise<UserPreference> {
    return this.userPreferences;
  }
  
  async saveUserPreferences(preferences: Filter): Promise<UserPreference> {
    this.userPreferences = {
      ...this.userPreferences,
      ...preferences,
    };
    return this.userPreferences;
  }
  
  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentId++;
    const newUser: User = {
      id,
      username: user.username,
      password: user.password,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    this.usernameToId.set(user.username, id);
    return newUser;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const id = this.usernameToId.get(username);
    if (id === undefined) return undefined;
    return this.users.get(id);
  }

  // Watch history operations
  async saveWatchHistory(history: InsertWatchHistory): Promise<WatchHistory> {
    const watchHistoryEntry: WatchHistory = {
      id: this.currentId++,
      userId: history.userId,
      videoId: history.videoId,
      watchedAt: new Date(),
      watchDuration: history.watchDuration || 0,
      completed: history.completed || false,
    };
    
    this.watchHistory.push(watchHistoryEntry);
    return watchHistoryEntry;
  }
  
  async getWatchHistoryByUser(userId: number, limit: number = 50): Promise<WatchHistory[]> {
    return this.watchHistory
      .filter(history => history.userId === userId)
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
      .slice(0, limit);
  }
  
  async getWatchHistoryByVideo(videoId: string, limit: number = 50): Promise<WatchHistory[]> {
    return this.watchHistory
      .filter(history => history.videoId === videoId)
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
      .slice(0, limit);
  }
  
  // Video interaction operations
  async saveVideoInteraction(interaction: InsertVideoInteraction): Promise<VideoInteraction> {
    // Check if interaction already exists for this user and video
    const existingIndex = this.videoInteractions.findIndex(
      i => i.userId === interaction.userId && 
           i.videoId === interaction.videoId && 
           i.interactionType === interaction.interactionType
    );
    
    // If exists, update it instead of creating a new one
    if (existingIndex !== -1) {
      this.videoInteractions[existingIndex] = {
        ...this.videoInteractions[existingIndex],
        createdAt: new Date(),
      };
      return this.videoInteractions[existingIndex];
    }
    
    // Otherwise create a new interaction
    const videoInteraction: VideoInteraction = {
      id: this.currentId++,
      userId: interaction.userId,
      videoId: interaction.videoId,
      interactionType: interaction.interactionType,
      createdAt: new Date(),
    };
    
    this.videoInteractions.push(videoInteraction);
    return videoInteraction;
  }
  
  async getVideoInteractions(userId: number, videoId?: string): Promise<VideoInteraction[]> {
    let interactions = this.videoInteractions.filter(interaction => interaction.userId === userId);
    
    if (videoId) {
      interactions = interactions.filter(interaction => interaction.videoId === videoId);
    }
    
    return interactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getVideoInteractionsByType(userId: number, type: string): Promise<VideoInteraction[]> {
    return this.videoInteractions
      .filter(interaction => interaction.userId === userId && interaction.interactionType === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getVideoLikes(userId: number): Promise<VideoInteraction[]> {
    return this.getVideoInteractionsByType(userId, 'like');
  }
}

export const storage = new MemStorage();
