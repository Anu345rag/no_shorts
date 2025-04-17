import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for storing searched videos
export const videos = pgTable("videos", {
  id: text("id").primaryKey(),  // YouTube video ID
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  channelId: text("channel_id"),
  channelTitle: text("channel_title"),
  publishedAt: timestamp("published_at"),
  duration: text("duration"), // ISO 8601 duration format
  viewCount: integer("view_count"),
  isShort: boolean("is_short").default(false).notNull(),
});

// Watch history table
export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: text("video_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
  watchDuration: integer("watch_duration"),
  completed: boolean("completed").default(false),
});

// Video interactions - likes, dislikes, etc.
export const videoInteractions = pgTable("video_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: text("video_id").notNull(),
  interactionType: text("interaction_type").notNull(), // 'like', 'dislike', 'share', 'save'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for storing channels
export const channels = pgTable("channels", {
  id: text("id").primaryKey(),  // YouTube channel ID
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subscriberCount: integer("subscriber_count"),
});

// Table for storing video categories/topics
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),  // YouTube category ID
  title: text("title").notNull(),
});

// Table for caching search queries
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Table structure for user preferences regarding filtering
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  excludeShorts: boolean("exclude_shorts").default(true).notNull(),
  excludeVertical: boolean("exclude_vertical").default(false),
  minDuration: integer("min_duration").default(0),
});

// Create schema for inserting videos
export const insertVideoSchema = createInsertSchema(videos);
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Create schema for inserting channels
export const insertChannelSchema = createInsertSchema(channels);
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

// Create schema for inserting categories
export const insertCategorySchema = createInsertSchema(categories);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Create schema for inserting search queries
export const insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  query: true,
});
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;

// Create schema for inserting users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Create schema for user preferences
export const insertUserPreferenceSchema = createInsertSchema(userPreferences).pick({
  excludeShorts: true,
  excludeVertical: true,
  minDuration: true,
});
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;

// Create schema for inserting watch history
export const insertWatchHistorySchema = createInsertSchema(watchHistory).omit({
  id: true,
  watchedAt: true,
});
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type WatchHistory = typeof watchHistory.$inferSelect;

// Create schema for inserting video interactions
export const insertVideoInteractionSchema = createInsertSchema(videoInteractions).omit({
  id: true,
  createdAt: true,
});
export type InsertVideoInteraction = z.infer<typeof insertVideoInteractionSchema>;
export type VideoInteraction = typeof videoInteractions.$inferSelect;

// Types for YouTube API responses
export type YouTubeVideo = {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    categoryId: string;
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
};

export type YouTubeSearchResult = {
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
};

export type YouTubeChannel = {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
  };
};

export type YouTubeCategory = {
  id: string;
  snippet: {
    title: string;
  };
};

// Schema for filtering
export const filterSchema = z.object({
  excludeShorts: z.boolean().default(true),
  excludeVertical: z.boolean().default(false),
  minDuration: z.number().min(0).default(0),
});

export type Filter = z.infer<typeof filterSchema>;
