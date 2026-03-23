import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Activity, UserPlus, FileEdit, Share2, UploadCloud } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function ActivityFeed() {
  const activities = [
    { user: "Sarah J.", action: "uploaded", target: "Q3_Report.pdf", time: "10 mins ago", icon: UploadCloud, color: "text-blue-500", bg: "bg-blue-500/10" },
    { user: "Mike T.", action: "edited", target: "Project_Proposal.docx", time: "1 hour ago", icon: FileEdit, color: "text-amber-500", bg: "bg-amber-500/10" },
    { user: "Elena G.", action: "shared", target: "Design_Assets.zip", time: "2 hours ago", icon: Share2, color: "text-purple-500", bg: "bg-purple-500/10" },
    { user: "System", action: "added user", target: "Alex R.", time: "Yesterday", icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { user: "You", action: "uploaded", target: "Invoice_023.pdf", time: "Yesterday", icon: UploadCloud, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  return (
    <Card className="shadow-lg border-0 bg-card rounded-3xl h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/10 px-6 pt-6 rounded-t-3xl shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="divide-y divide-border/10 flex-1">
          {activities.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div key={i} className="flex items-start gap-4 p-4 px-6 hover:bg-muted/30 transition-colors group">
                <Avatar className="w-10 h-10 border-2 border-background shadow-sm mt-0.5">
                  <AvatarFallback className={`${activity.bg} ${activity.color} font-bold text-xs`}>
                    {activity.user === "System" ? "SYS" : activity.user === "You" ? "YOU" : activity.user.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{activity.user}</span> {activity.action} <span className="font-medium text-primary cursor-pointer hover:underline">{activity.target}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Icon className={`w-3 h-3 ${activity.color}`} />
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 px-6 border-t border-border/10 shrink-0">
          <button className="w-full py-2 text-sm font-medium text-center text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors">
            View Activity Log
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
