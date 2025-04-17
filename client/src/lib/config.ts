// YouTube API configuration
export const YOUTUBE_API = {
    KEY: import.meta.env.VITE_YOUTUBE_API_KEY || "",
    BASE_URL: "https://www.googleapis.com/youtube/v3",
    EMBED_URL: "https://www.youtube.com/embed",
    RESULTS_PER_PAGE: 20,
  };
  
  // Min durations for determining shorts (in seconds)
  export const MIN_SHORT_DURATION = 60; // Videos under 60 seconds might be shorts
  
  // Aspect ratio threshold for vertical videos
  export const VERTICAL_ASPECT_RATIO_THRESHOLD = 1; // width/height < 1 means vertical
  