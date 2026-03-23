import { Badge } from "./ui/badge";
import { StorageOverviewCard } from "./StorageOverviewCard";
import { RecentFilesList } from "./RecentFilesList";
import { QuickActions } from "./QuickActions";
import { ActivityFeed } from "./ActivityFeed";

export function Dashboard() {
  return (
    <div className="min-h-screen pb-12">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage your documents and view storage analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5 font-medium rounded-full shadow-sm hover:bg-primary/20 transition-colors">
              <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
              System Online
            </Badge>
          </div>
        </div>

        {/* Top Cards: Quick Actions and Storage Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <div className="lg:col-span-1">
            <StorageOverviewCard />
          </div>
        </div>

        {/* Main Content: Recent Files and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentFilesList />
          </div>
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
