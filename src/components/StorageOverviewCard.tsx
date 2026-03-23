import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { HardDrive, Cloud, FileBox } from "lucide-react";

export function StorageOverviewCard() {
  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/30 h-full overflow-hidden relative group rounded-3xl">
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
        <HardDrive size={120} />
      </div>
      <CardHeader className="pb-4 border-b border-border/10 bg-background/50 backdrop-blur-sm relative z-10 rounded-t-3xl">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          Storage Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 relative z-10">
        <div className="flex flex-col space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-bold tracking-tight">72.4</span>
                <span className="text-sm font-medium text-muted-foreground ml-1">GB used</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">100 GB total</span>
            </div>
            <Progress value={72.4} className="h-2.5 bg-primary/20 [&>div]:bg-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/40">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileBox className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Documents</p>
                <p className="text-xs text-muted-foreground">45 GB</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/40">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Media</p>
                <p className="text-xs text-muted-foreground">27.4 GB</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
