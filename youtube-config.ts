// YouTube API configuration
export const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
export const MIN_SHORT_DURATION = 60; // videos under 60 seconds are likely shorts