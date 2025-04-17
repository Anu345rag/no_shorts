import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoGrid from "@/components/VideoGrid";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVideoInteractions, WatchHistoryWithVideo } from "@/hooks/use-video-interactions";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useAuth } from "@/hooks/use-auth";
import { Video } from "@shared/schema";
import { Loader2, History, ThumbsUp, Bookmark, TrendingUp, BarChart3 } from "lucide-react";

// Helper function to get top channels from watched videos
const getTopChannels = (videos: Video[]) => {
  const channelCount: Record<string, { name: string, count: number }> = {};
  
  videos.forEach(video => {
    if (video.channelId && video.channelTitle) {
      if (!channelCount[video.channelId]) {
        channelCount[video.channelId] = { name: video.channelTitle, count: 0 };
      }
      channelCount[video.channelId].count += 1;
    }
  });
  
  // Convert to array and sort by count
  const channels = Object.values(channelCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  // Calculate percentages
  const totalVideos = videos.length;
  return channels.map(channel => ({
    ...channel,
    percentage: Math.round((channel.count / totalVideos) * 100)
  }));
};

// Calculate average video completion rate
const calculateCompletionRate = (watchHistory: WatchHistoryWithVideo[]) => {
  if (!watchHistory || watchHistory.length === 0) return 0;
  
  let totalCompletionRate = 0;
  let countWithDuration = 0;
  
  watchHistory.forEach(history => {
    if (history.completed) {
      totalCompletionRate += 100;
      countWithDuration++;
    } else if (history.watchDuration && history.video?.duration) {
      // Parse duration string (PT1H30M15S format)
      const durationString = history.video.duration;
      const durationMatch = durationString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      
      if (durationMatch) {
        const hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
        const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
        const seconds = durationMatch[3] ? parseInt(durationMatch[3]) : 0;
        
        const totalDurationSeconds = hours * 3600 + minutes * 60 + seconds;
        if (totalDurationSeconds > 0) {
          const completionPercentage = Math.min(100, Math.round((history.watchDuration / totalDurationSeconds) * 100));
          totalCompletionRate += completionPercentage;
          countWithDuration++;
        }
      }
    }
  });
  
  return countWithDuration > 0 ? Math.round(totalCompletionRate / countWithDuration) : 0;
};

export default function UserHistory() {
  const { user } = useAuth();
  const { 
    watchHistory, 
    isWatchHistoryLoading, 
    likedVideos, 
    isLikedVideosLoading,
    savedVideos,
    isSavedVideosLoading
  } = useVideoInteractions();
  const { recommendedVideos, isLoading: isRecommendationsLoading } = useRecommendations();
  
  // Extract videos from history and interactions
  const watchedVideos: Video[] = watchHistory
    ? watchHistory
        .filter(item => item.video)
        .map(item => item.video)
        .filter((value, index, self) => 
          index === self.findIndex(v => v.id === value.id)
        )
    : [];
  
  const likedVideoList: Video[] = likedVideos
    ? likedVideos
        .filter(item => item.video)
        .map(item => item.video)
    : [];
    
  const savedVideoList: Video[] = savedVideos
    ? savedVideos
        .filter(item => item.video)
        .map(item => item.video)
    : [];
  
  // Calculate watch statistics
  const totalWatchedVideos = watchedVideos.length;
  const totalWatchTime = watchHistory
    ? watchHistory.reduce((total, curr) => total + (curr.watchDuration || 0), 0)
    : 0;
  
  // Format watch time (convert seconds to hours/minutes)
  const formatWatchTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };
  
  if (!user) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Sign in to view your history</h1>
        <p className="text-gray-600 mb-6">You need to be logged in to access your watch history and recommendations.</p>
        <Link to="/auth">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Video History</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <History className="mr-2 h-4 w-4" /> Watch History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWatchedVideos} videos</div>
            <p className="text-xs text-gray-500">
              Total watch time: {formatWatchTime(totalWatchTime)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ThumbsUp className="mr-2 h-4 w-4" /> Liked Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{likedVideoList.length} videos</div>
            <p className="text-xs text-gray-500">
              {likedVideoList.length > 0 
                ? `Last liked: ${likedVideoList[0]?.title?.substring(0, 20)}...` 
                : 'No liked videos yet'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bookmark className="mr-2 h-4 w-4" /> Saved Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedVideoList.length} videos</div>
            <p className="text-xs text-gray-500">
              {savedVideoList.length > 0 
                ? `${savedVideoList.length} videos saved for later` 
                : 'No saved videos yet'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Analytics Section */}
      {watchHistory && watchHistory.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Watch Analytics</CardTitle>
            <CardDescription>Insights based on your viewing habits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Top Channels */}
              <div>
                <h3 className="font-medium mb-2">Your Top Channels</h3>
                <div className="space-y-2">
                  {getTopChannels(watchedVideos).map((channel, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="truncate max-w-[200px]">{channel.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{channel.count} videos</span>
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${channel.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Watch Completion */}
              <div>
                <h3 className="font-medium mb-2">Video Completion Rate</h3>
                <div className="flex justify-between items-center">
                  <span>Average completion</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {calculateCompletionRate(watchHistory)}%
                    </span>
                    <div className="w-20 bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${calculateCompletionRate(watchHistory)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="recommendations" className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" /> Recommendations
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="mr-2 h-4 w-4" /> Watch History
          </TabsTrigger>
          <TabsTrigger value="liked" className="flex items-center">
            <ThumbsUp className="mr-2 h-4 w-4" /> Liked
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center">
            <Bookmark className="mr-2 h-4 w-4" /> Saved
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommendations">
          {isRecommendationsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VideoGrid
              videos={recommendedVideos}
              emptyMessage="We're building recommendations based on your watch history"
            />
          )}
        </TabsContent>
        
        <TabsContent value="history">
          {isWatchHistoryLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VideoGrid
              videos={watchedVideos}
              emptyMessage="Your watch history is empty"
            />
          )}
        </TabsContent>
        
        <TabsContent value="liked">
          {isLikedVideosLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VideoGrid
              videos={likedVideoList}
              emptyMessage="You haven't liked any videos yet"
            />
          )}
        </TabsContent>
        
        <TabsContent value="saved">
          {isSavedVideosLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VideoGrid
              videos={savedVideoList}
              emptyMessage="You haven't saved any videos yet"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}