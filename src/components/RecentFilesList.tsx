import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, FileBox, FileImage, FileCode, MoreHorizontal } from "lucide-react";

export function RecentFilesList() {
  const files = [
    { name: "Q3_Financial_Report.pdf", type: "pdf", size: "2.4 MB", date: "2 mins ago", icon: FileBox, color: "text-red-500", bg: "bg-red-500/10" },
    { name: "Project_Proposal_v2.docx", type: "doc", size: "1.1 MB", date: "1 hour ago", icon: FileBox, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Hero_Image_Final.png", type: "img", size: "4.8 MB", date: "3 hours ago", icon: FileImage, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "index.tsx", type: "code", size: "12 KB", date: "Yesterday", icon: FileCode, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Employee_Handbook_2026.pdf", type: "pdf", size: "5.2 MB", date: "Yesterday", icon: FileBox, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <Card className="shadow-lg border-0 bg-card rounded-3xl h-full">
      <CardHeader className="pb-4 border-b border-border/10 px-6 pt-6 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Files
          </CardTitle>
          <button className="text-sm font-medium text-primary hover:underline">View All</button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/10">
          {files.map((file, i) => {
            const Icon = file.icon;
            return (
              <div key={i} className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${file.bg} transition-transform group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${file.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{file.size}</span>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <span className="text-xs text-muted-foreground">{file.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Badge variant="secondary" className="bg-background border-border/40 font-normal shadow-sm hidden sm:inline-flex">
                    {file.type.toUpperCase()}
                  </Badge>
                  <button className="p-2 text-muted-foreground hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
