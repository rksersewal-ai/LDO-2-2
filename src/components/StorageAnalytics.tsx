import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend } from "recharts";
import { HardDrive, TrendingUp, AlertCircle, FileBox, FileImage, FileCode, Film, FileText, Database } from "lucide-react";

export function StorageAnalytics() {
  const pieData = [
    { name: "Documents", value: 45, color: "#3b82f6" },
    { name: "Images", value: 15, color: "#10b981" },
    { name: "Videos", value: 20, color: "#8b5cf6" },
    { name: "Code", value: 5, color: "#f59e0b" },
    { name: "Other", value: 15, color: "#64748b" },
  ];

  const barData = [
    { name: "Jan", Documents: 30, Media: 10, Other: 5 },
    { name: "Feb", Documents: 35, Media: 12, Other: 6 },
    { name: "Mar", Documents: 38, Media: 15, Other: 8 },
    { name: "Apr", Documents: 40, Media: 20, Other: 10 },
    { name: "May", Documents: 42, Media: 25, Other: 12 },
    { name: "Jun", Documents: 45, Media: 27, Other: 15 },
  ];

  const stats = [
    { label: "Total Capacity", value: "100 GB", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Used Storage", value: "72.4 GB", icon: HardDrive, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Free Space", value: "27.6 GB", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="min-h-screen pb-12">
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Storage Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Monitor your storage usage and trends over time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 px-3 py-1.5 font-medium rounded-full shadow-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              72% Used
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="shadow-md border-0 bg-card rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Storage Composition Pie Chart */}
          <Card className="lg:col-span-1 shadow-lg border-0 bg-card rounded-3xl h-full">
            <CardHeader className="pb-2 border-b border-border/10 px-6 pt-6 rounded-t-3xl">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <FileBox className="w-5 h-5 text-primary" />
                Storage by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value}%`, "Usage"]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold">72.4</span>
                  <span className="text-xs text-muted-foreground font-medium">GB Used</span>
                </div>
              </div>
              <div className="w-full space-y-3 mt-4">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="font-medium text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Growth Trend */}
          <Card className="lg:col-span-2 shadow-lg border-0 bg-card rounded-3xl h-full">
            <CardHeader className="pb-4 border-b border-border/10 px-6 pt-6 rounded-t-3xl">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Growth Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                      dx={-10} 
                    />
                    <RechartsTooltip 
                      cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                    <Bar dataKey="Documents" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Media" stackId="a" fill="#10b981" />
                    <Bar dataKey="Other" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
