import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import WatchVideo from "@/pages/WatchVideo";
import Search from "@/pages/Search";
import Category from "@/pages/Category";
import AuthPage from "@/pages/auth-page";
import UserHistory from "@/pages/UserHistory";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { FilterContextProvider } from "@/contexts/FilterContext";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <div className="flex flex-col h-screen">
          <Header />
          <div className="flex flex-1 overflow-hidden relative">
            <Sidebar />
            <div className="flex-1 overflow-hidden">
              <Switch>
                <ProtectedRoute path="/" component={Home} />
                <ProtectedRoute path="/watch/:videoId" component={WatchVideo} />
                <ProtectedRoute path="/search/:query" component={Search} />
                <ProtectedRoute path="/category/:categoryId" component={Category} />
                <ProtectedRoute path="/history" component={UserHistory} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FilterContextProvider>
          <Router />
          <Toaster />
        </FilterContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
