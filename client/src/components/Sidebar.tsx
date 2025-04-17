import { useLocation } from "wouter";
import { useFilter } from "@/contexts/FilterContext";
import FilterOptions from "./FilterOptions";
import { 
  Home, 
  Flame, 
  TrendingUp, 
  Music, 
  Gamepad2, 
  Newspaper, 
  Trophy, 
  GraduationCap,
  Menu,
  ChevronLeft,
  History,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const Sidebar = () => {
  const [location, navigate] = useLocation();
  const { filter, updateFilter } = useFilter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();

  const isActive = (path: string) => location === path;

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const menuItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Flame, label: "Trending", path: "/category/trending" },
    { icon: TrendingUp, label: "Popular", path: "/category/popular" },
    { icon: Music, label: "Music", path: "/category/10" },  // 10 is YouTube's music category ID
    { icon: Gamepad2, label: "Gaming", path: "/category/20" }, // 20 is YouTube's gaming category ID
    { icon: Newspaper, label: "News", path: "/category/25" }, // 25 is YouTube's news category ID
    { icon: Trophy, label: "Sports", path: "/category/17" }, // 17 is YouTube's sports category ID
    { icon: GraduationCap, label: "Learning", path: "/category/27" }, // 27 is YouTube's education category ID
  ];

  return (
    <>
      {/* Toggle button - visible on all screens */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-16 left-2 z-10 p-2 rounded-full bg-white shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      <aside 
        className={cn(
          "sidebar bg-white overflow-y-auto flex-shrink-0 h-full pt-2 transition-all duration-300",
          isMobile 
            ? collapsed ? "fixed left-0 z-50 w-60" : "fixed -left-64 z-50 w-60"
            : collapsed ? "w-20" : "w-60"
        )}
      >
        {/* Sidebar toggle button - visible only on desktop */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center mb-4 ml-auto mr-3 p-1 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
        </button>
        
        <nav>
          {menuItems.map((item) => (
            <div key={item.path} className="px-3 mb-3">
              <button
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center px-3 py-2 text-gray-900 rounded-lg w-full text-left",
                  isActive(item.path) ? "bg-gray-100" : "hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 min-w-5" />
                {!collapsed && <span className="ml-4">{item.label}</span>}
              </button>
            </div>
          ))}
          
          {/* User section */}
          {user && (
            <>
              <div className="px-3 mb-3">
                <button
                  onClick={() => navigate("/history")}
                  className={cn(
                    "flex items-center px-3 py-2 text-gray-900 rounded-lg w-full text-left",
                    isActive("/history") ? "bg-gray-100" : "hover:bg-gray-100"
                  )}
                >
                  <History className="h-5 w-5 min-w-5" />
                  {!collapsed && <span className="ml-4">History & Likes</span>}
                </button>
              </div>
            </>
          )}
          
          {!collapsed && (
            <>
              <div className="border-t border-gray-200 my-3"></div>
              
              <div className="px-6 py-2 text-gray-600 font-medium text-sm">
                FILTER OPTIONS
              </div>
              
              <FilterOptions />
            </>
          )}
        </nav>
      </aside>
      
      {/* Overlay for mobile */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;
