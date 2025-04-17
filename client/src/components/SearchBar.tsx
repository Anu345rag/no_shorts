import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const searchSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

const SearchBar = () => {
  const [, navigate] = useLocation();
  
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  const onSubmit = (data: SearchFormValues) => {
    navigate(`/search/${encodeURIComponent(data.query)}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full">
        <FormField
          control={form.control}
          name="query"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <Input
                {...field}
                placeholder="Search videos (shorts automatically filtered)"
                className="w-full border border-gray-300 py-2 px-4 rounded-l-full focus:outline-none focus:border-blue-500 h-10"
              />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          variant="outline" 
          className="bg-gray-100 border border-l-0 border-gray-300 px-4 rounded-r-full hover:bg-gray-200 h-10"
        >
          <Search className="h-5 w-5 text-gray-600" />
        </Button>
      </form>
    </Form>
  );
};

export default SearchBar;
