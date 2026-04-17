import { useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
        <AlertCircle className="h-7 w-7 text-rose-400" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Page Not Found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or you don't have permission
          to access it.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-secondary/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
        >
          <Home className="h-4 w-4" /> Dashboard
        </button>
      </div>
    </div>
  );
}
