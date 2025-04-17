import { createContext, useContext, useState, ReactNode } from "react";
import { Filter, filterSchema } from "@shared/schema";

interface FilterContextType {
  filter: Filter;
  updateFilter: (newFilter: Partial<Filter>) => void;
}

const defaultFilter: Filter = {
  excludeShorts: true,
  excludeVertical: false,
  minDuration: 0,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterContextProvider = ({ children }: { children: ReactNode }) => {
  const [filter, setFilter] = useState<Filter>(defaultFilter);

  const updateFilter = (newFilter: Partial<Filter>) => {
    setFilter((prevFilter) => {
      const updatedFilter = { ...prevFilter, ...newFilter };
      return filterSchema.parse(updatedFilter);
    });
  };

  return (
    <FilterContext.Provider value={{ filter, updateFilter }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterContextProvider");
  }
  return context;
};
