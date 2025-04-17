import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

const CategoryChips = () => {
  const [location, navigate] = useLocation();
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  const isActive = (path: string) => location === path;
  
  // Default categories if we don't have data from the API yet
  const defaultCategories = [
    { id: "all", title: "All" },
    { id: "live", title: "Live" },
    { id: "10", title: "Music" },
    { id: "20", title: "Gaming" },
    { id: "25", title: "News" },
    { id: "cooking", title: "Cooking" },
    { id: "recent", title: "Recently uploaded" },
    { id: "watched", title: "Watched" },
    { id: "new", title: "New to you" },
  ];
  
  const displayCategories = categories || defaultCategories;
  
  return (
    <ScrollArea className="w-full whitespace-nowrap pb-3 mb-4">
      <div className="flex space-x-3">
        {displayCategories.map((category) => (
          <Button
            key={category.id}
            variant={isActive(`/category/${category.id}`) || (category.id === "all" && location === "/") ? "default" : "outline"}
            className={`rounded-md text-sm ${
              isActive(`/category/${category.id}`) || (category.id === "all" && location === "/")
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
            onClick={() => {
              if (category.id === "all") {
                navigate("/");
              } else {
                navigate(`/category/${category.id}`);
              }
            }}
          >
            {category.title}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default CategoryChips;
