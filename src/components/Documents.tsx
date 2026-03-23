import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { 
  Search, 
  FolderPlus, 
  Upload, 
  Filter, 
  LayoutGrid, 
  List, 
  Folder, 
  MoreVertical,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet
} from "lucide-react";

export function Documents() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  
  const folders = [
    { name: "Financial Reports", items: 24, size: "128 MB", color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Project Assets", items: 142, size: "1.2 GB", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Contracts 2026", items: 8, size: "14 MB", color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "HR Documents", items: 56, size: "84 MB", color: "text-purple-500", bg: "bg-purple-500/10" }
  ];
  
  const files = [
    { name: "Q3_Financial_Report.pdf", type: "PDF Document", size: "2.4 MB", date: "Oct 12, 2026", icon: FileText, color: "text-red-500", bg: "bg-red-500/10" },
    { name: "Project_Proposal_v2.docx", type: "Word Document", size: "1.1 MB", date: "Oct 10, 2026", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Budget_Forecast_2027.xlsx", type: "Spreadsheet", size: "3.2 MB", date: "Oct 08, 2026", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Hero_Image_Final.png", type: "Image", size: "4.8 MB", date: "Oct 05, 2026", icon: FileImage, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { name: "main_layout.tsx", type: "Source Code", size: "12 KB", date: "Oct 01, 2026", icon: FileCode, color: "text-amber-500", bg: "bg-amber-500/10" }
  ];

  return (
    <div className="min-h-screen pb-12">
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Browse, search, and manage your files and folders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl border-border/40 hover:bg-muted/50 transition-colors">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button className="rounded-xl shadow-md hover:shadow-lg transition-all">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-2 rounded-2xl shadow-sm border border-border/40">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-9 bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary h-10"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
            <div className="h-6 w-px bg-border/40 mx-1"></div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-xl ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Folders Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Quick Folders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {folders.map((folder, i) => (
              <Card key={i} className="shadow-sm hover:shadow-md transition-all duration-300 border-border/40 bg-card rounded-2xl group cursor-pointer hover:-translate-y-1">
                <CardContent className="p-5 flex items-start justify-between">
                  <div className="flex flex-col space-y-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${folder.bg}`}>
                      <Folder className={`w-5 h-5 ${folder.color}`} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{folder.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{folder.items} items</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Files Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Recent Files</h2>
          
          {viewMode === "list" ? (
            <div className="bg-card rounded-3xl shadow-sm border border-border/40 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/10 text-sm font-medium text-muted-foreground bg-muted/10 px-6">
                <div className="col-span-6 md:col-span-5">Name</div>
                <div className="col-span-3 hidden md:block">Type</div>
                <div className="col-span-3 md:col-span-2">Size</div>
                <div className="col-span-3 md:col-span-2 hidden sm:block">Modified</div>
                <div className="col-span-3 sm:col-span-2 md:col-span-1 text-right"></div>
              </div>
              <div className="divide-y divide-border/10">
                {files.map((file, i) => {
                  const Icon = file.icon;
                  return (
                    <div key={i} className="grid grid-cols-12 gap-4 p-4 px-6 items-center hover:bg-muted/30 transition-colors group cursor-pointer">
                      <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${file.bg}`}>
                          <Icon className={`w-5 h-5 ${file.color}`} />
                        </div>
                        <span className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{file.name}</span>
                      </div>
                      <div className="col-span-3 hidden md:block text-sm text-muted-foreground">
                        {file.type}
                      </div>
                      <div className="col-span-3 md:col-span-2 text-sm text-muted-foreground">
                        {file.size}
                      </div>
                      <div className="col-span-3 md:col-span-2 hidden sm:block text-sm text-muted-foreground">
                        {file.date}
                      </div>
                      <div className="col-span-3 sm:col-span-2 md:col-span-1 text-right">
                        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((file, i) => {
                const Icon = file.icon;
                return (
                  <Card key={i} className="shadow-sm hover:shadow-md transition-all duration-300 border-border/40 bg-card rounded-2xl group cursor-pointer hover:-translate-y-1">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-4">
                      <div className="w-full flex justify-end">
                        <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${file.bg} group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-8 h-8 ${file.color}`} />
                      </div>
                      <div className="w-full">
                        <p className="font-medium text-sm text-foreground truncate px-2 group-hover:text-primary transition-colors" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{file.size}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
