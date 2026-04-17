import { GlassCard, Badge, Button } from "../components/ui/Shared";
import {
  FileText,
  Clock,
  HardDrive,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { MOCK_DOCUMENTS } from "../lib/mock";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const storageData = [
  { name: "Mon", usage: 4000 },
  { name: "Tue", usage: 4200 },
  { name: "Wed", usage: 4500 },
  { name: "Thu", usage: 4600 },
  { name: "Fri", usage: 4800 },
  { name: "Sat", usage: 5000 },
  { name: "Sun", usage: 5400 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Welcome back. You have 3 pending approvals and 1 open case.
          </p>
        </div>
        <Button>Upload Document</Button>
      </div>

      {/* Top Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-semibold">Pending Approvals</h3>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">3</div>
          <p className="text-xs text-slate-500">
            2 documents awaiting your sign-off
          </p>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-semibold">Open Cases</h3>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">1</div>
          <p className="text-xs text-slate-500">Linked to PL-55092</p>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-semibold">LAN Storage</h3>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            5.4 <span className="text-lg text-slate-400 font-normal">TB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 mb-1">
            <div
              className="bg-teal-500 h-1.5 rounded-full"
              style={{ width: "68%" }}
            ></div>
          </div>
          <p className="text-xs text-slate-500">
            68% capacity. 320GB grown this week.
          </p>
        </GlassCard>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Files */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Documents</h2>
              <Button variant="ghost" className="text-xs">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {MOCK_DOCUMENTS.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center p-3 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-teal-500/10 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-900/30 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-teal-300 transition-colors">
                      {doc.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{doc.id}</span>
                      <span>•</span>
                      <span>Rev {doc.revision}</span>
                      <span>•</span>
                      <span>{doc.date}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <Badge
                      variant={
                        doc.status === "Approved"
                          ? "success"
                          : doc.status === "In Review"
                            ? "warning"
                            : "default"
                      }
                    >
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Storage Analytics Mini */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Ingest Velocity
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={storageData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#2dd4bf" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsage)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
