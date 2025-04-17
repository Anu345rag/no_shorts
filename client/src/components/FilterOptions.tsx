import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFilter } from "@/contexts/FilterContext";
import { useState, useEffect } from "react";

const FilterOptions = () => {
  const { filter, updateFilter } = useFilter();
  const [minDurationLabel, setMinDurationLabel] = useState(`${filter.minDuration} min`);

  // Update the duration label when the slider changes
  useEffect(() => {
    setMinDurationLabel(`${filter.minDuration} min`);
  }, [filter.minDuration]);

  const handleExcludeShortsChange = (checked: boolean) => {
    updateFilter({ excludeShorts: checked });
  };

  const handleExcludeVerticalChange = (checked: boolean) => {
    updateFilter({ excludeVertical: checked });
  };

  const handleMinDurationChange = (value: number[]) => {
    updateFilter({ minDuration: value[0] });
  };

  return (
    <div className="px-3 space-y-4">
      <div className="flex items-center px-3 py-2">
        <Checkbox 
          id="exclude-shorts" 
          checked={filter.excludeShorts}
          onCheckedChange={handleExcludeShortsChange}
          className="mr-3" 
        />
        <Label htmlFor="exclude-shorts" className="text-gray-900 cursor-pointer">
          Exclude Shorts
        </Label>
      </div>
      
      <div className="flex items-center px-3 py-2">
        <Checkbox 
          id="exclude-vertical" 
          checked={filter.excludeVertical}
          onCheckedChange={handleExcludeVerticalChange}
          className="mr-3" 
        />
        <Label htmlFor="exclude-vertical" className="text-gray-900 cursor-pointer">
          Exclude Vertical Videos
        </Label>
      </div>
      
      <div className="px-3 py-2">
        <div className="flex items-center">
          <Slider
            id="min-duration"
            min={0}
            max={60}
            step={1}
            value={[filter.minDuration]}
            onValueChange={handleMinDurationChange}
            className="w-full"
          />
          <span className="ml-2 text-sm text-gray-600">{minDurationLabel}</span>
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Minimum video duration
        </div>
      </div>
    </div>
  );
};

export default FilterOptions;
