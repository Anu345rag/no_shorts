import { useState } from "react";
import { useLocation } from "wouter";
import SearchBar from "./SearchBar";
import { Menu, Bell, User, LogOut, LogIn, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
    // Toggle sidebar visibility class on the document
    document.body.classList.toggle("sidebar-visible", !isSidebarVisible);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navigateToAuth = () => {
    navigate("/auth");
  };

  // Get the user's initials for the avatar
  const getUserInitials = () => {
    if (!user || !user.username) return "U";
    return user.username.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white flex items-center justify-between px-4 py-2 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center">
        <button 
          className="p-2 mr-2 rounded-full hover:bg-gray-100" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <button onClick={() => navigate("/")} className="flex items-center">
          <span className="text-[#FF0000] font-bold text-2xl mr-1">NoShorts</span>
          <div className="bg-[#FF0000] text-white rounded-md px-1.5 py-0.5 text-xs font-medium">
            NO SHORTS
          </div>
        </button>
      </div>
      
      <div className="flex-grow max-w-2xl mx-4">
        <SearchBar />
      </div>
      
      <div className="flex items-center">
        <button className="p-2 rounded-full hover:bg-gray-100 mr-2" aria-label="Notifications">
          <Bell className="h-6 w-6" />
        </button>
        
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Account
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={navigateToAuth}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
