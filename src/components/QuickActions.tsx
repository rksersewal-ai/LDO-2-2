import { Card, CardContent } from "./ui/card";
import { Upload, FolderPlus, FileText, Share2, Search, Link as LinkIcon } from "lucide-react";
import { Button } from "./ui/button";

export function QuickActions() {
  const actions = [
    { icon: Upload, label: "Upload File", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    { icon: FolderPlus, label: "New Folder", color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" },
    { icon: FileText, label: "Create Doc", color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
    { icon: Share2, label: "Share", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
  ];

  return (
    <Card className="shadow-lg border-0 bg-card rounded-3xl overflow-hidden h-full">
      <CardContent className="p-6 md:p-8 h-full flex flex-col justify-center">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
          <Search className="w-5 h-5 text-primary" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 w-full">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Button
                key={i}
                variant="outline"
                className={`h-auto py-6 flex flex-col items-center justify-center gap-3 rounded-2xl border-border/50 transition-all duration-300 hover:scale-105 hover:shadow-md ${action.color}`}
              >
                <div className="p-3 bg-background rounded-xl shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-medium text-sm text-foreground">{action.label}</span>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-6 md:mt-8 flex items-center gap-3 bg-muted/40 p-4 rounded-2xl border border-border/40">
          <LinkIcon className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Drag and drop files here to quick upload or use the actions above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
