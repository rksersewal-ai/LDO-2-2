import { useState, useEffect } from "react";
import { GlassCard, Badge, Button, PageHeader } from "../components/ui/Shared";
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

const generateMetricHistory = (base: number, variance: number) =>
  Array.from({ length: 20 }, (_, i) => ({
    time: `${20 - i}m`,
    value: Math.max(
      0,
      Math.min(100, base + (Math.random() - 0.5) * variance * 2),
    ),
  })).reverse();

const SERVICES = [
  {
    name: "EDMS Web App",
    status: "healthy",
    uptime: "99.98%",
    latency: "42ms",
    lastCheck: "5s ago",
  },
  {
    name: "API Server",
    status: "healthy",
    uptime: "99.95%",
    latency: "67ms",
    lastCheck: "5s ago",
  },
  {
    name: "OCR Pipeline",
    status: "warning",
    uptime: "97.2%",
    latency: "1.4s",
    lastCheck: "5s ago",
  },
  {
    name: "Search Index",
    status: "healthy",
    uptime: "99.99%",
    latency: "12ms",
    lastCheck: "5s ago",
  },
  {
    name: "Auth Service",
    status: "healthy",
    uptime: "100%",
    latency: "8ms",
    lastCheck: "5s ago",
  },
  {
    name: "Backup Service",
    status: "healthy",
    uptime: "99.7%",
    latency: "—",
    lastCheck: "10m ago",
  },
];

const SLOW_QUERIES = [
  {
    query: 'SELECT * FROM documents WHERE ocr_status = "Processing"',
    duration: "1840ms",
    hits: 42,
  },
  {
    query: 'JOIN work_records ON pl_number LIKE "%WAP%"',
    duration: "920ms",
    hits: 18,
  },
  {
    query: "COUNT(*) FROM audit_log GROUP BY user_id",
    duration: "640ms",
    hits: 7,
  },
];

const BACKUPS = [
  {
    label: "Last Full Backup",
    time: "2026-03-25 02:00 UTC",
    size: "1.4 GB",
    status: "success",
  },
  {
    label: "Last Incremental",
    time: "2026-03-25 08:00 UTC",
    size: "42 MB",
    status: "success",
  },
  {
    label: "Next Scheduled",
    time: "2026-03-25 14:00 UTC",
    size: "~50 MB",
    status: "pending",
  },
];

export default function SystemHealth() {
  const [cpuData] = useState(() => generateMetricHistory(34, 20));
  const [memData] = useState(() => generateMetricHistory(58, 10));
  const [diskData] = useState(() => generateMetricHistory(61, 3));
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backups, setBackups] = useState(BACKUPS);

  const refresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshTime(new Date());
      setIsRefreshing(false);
    }, 800);
  };

  const triggerBackup = () => {
    const requestedAt = new Date();
    const backupRecord = {
      label: `Manual Backup Request`,
      time: requestedAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      size: "Pending",
      status: "pending",
    };
    setBackups((current) => [backupRecord, ...current.slice(0, 2)]);
    toast.success("Backup queued", {
      description:
        "A manual backup request has been added to the operations queue.",
    });
  };

  const currentCPU = Math.round(cpuData[cpuData.length - 1].value);
  const currentMem = Math.round(memData[memData.length - 1].value);
  const currentDisk = Math.round(diskData[diskData.length - 1].value);
  const healthyCount = SERVICES.filter((s) => s.status === "healthy").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="System Health"
        subtitle="Real-time service metrics, performance indicators, and backup status."
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {refreshTime.toLocaleTimeString()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Services Online",
            value: `${healthyCount}/${SERVICES.length}`,
            icon: Server,
            color: "text-primary bg-teal-500/10",
          },
          {
            label: "CPU Usage",
            value: `${currentCPU}%`,
            icon: Cpu,
            color:
              currentCPU > 80
                ? "text-rose-400 bg-rose-500/10"
                : "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Memory",
            value: `${currentMem}%`,
            icon: Activity,
            color:
              currentMem > 85
                ? "text-amber-400 bg-amber-500/10"
                : "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Disk Usage",
            value: `${currentDisk}%`,
            icon: HardDrive,
            color:
              currentDisk > 90
                ? "text-rose-400 bg-rose-500/10"
                : "text-blue-400 bg-blue-500/10",
          },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <div
              className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}
            >
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "CPU Usage %", data: cpuData, color: "#14b8a6" },
          { label: "Memory Usage %", data: memData, color: "#8b5cf6" },
          { label: "Disk Usage %", data: diskData, color: "#3b82f6" },
        ].map((chart) => (
          <GlassCard key={chart.label} className="p-4">
            <div className="text-xs text-muted-foreground font-medium mb-3">
              {chart.label}
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chart.data}>
                <defs>
                  <linearGradient
                    id={`grad-${chart.color}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={chart.color}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={chart.color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  interval={4}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chart.color}
                  fill={`url(#grad-${chart.color})`}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        ))}
      </div>

      {/* Services */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-white">Service Status</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {SERVICES.map((svc) => (
            <div key={svc.name} className="flex items-center gap-4 px-5 py-3">
              <div
                className={`w-2 h-2 rounded-full ${svc.status === "healthy" ? "bg-emerald-500" : svc.status === "warning" ? "bg-amber-500" : "bg-rose-500"} shrink-0`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{svc.name}</div>
                <div className="text-xs text-muted-foreground">
                  Last checked: {svc.lastCheck}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted-foreground tabular-nums">
                  Uptime: {svc.uptime}
                </div>
                <div className="text-xs text-slate-600">
                  Latency: {svc.latency}
                </div>
              </div>
              <Badge
                variant={
                  svc.status === "healthy"
                    ? "success"
                    : svc.status === "warning"
                      ? "warning"
                      : "danger"
                }
                size="sm"
              >
                {svc.status}
              </Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Backup Status + Slow Queries side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Backup Status
              </h3>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs flex items-center gap-1"
              onClick={triggerBackup}
            >
              <Download className="w-3 h-3" /> Trigger Backup
            </Button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {backups.map((b) => (
              <div key={b.label} className="flex items-center gap-4 px-5 py-3">
                <div
                  className={`w-2 h-2 rounded-full ${b.status === "success" ? "bg-emerald-500" : "bg-slate-600"} shrink-0`}
                />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white">
                    {b.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.time} · {b.size}
                  </div>
                </div>
                <Badge
                  variant={b.status === "success" ? "success" : "default"}
                  size="sm"
                >
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Slow Queries</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {SLOW_QUERIES.map((q, i) => (
              <div key={i} className="px-5 py-3">
                <div className="text-xs font-mono text-muted-foreground truncate mb-1">
                  {q.query}
                </div>
                <div className="flex gap-4 text-xs text-slate-600">
                  <span className="text-amber-400 tabular-nums">
                    {q.duration}
                  </span>
                  <span>{q.hits} hits</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
