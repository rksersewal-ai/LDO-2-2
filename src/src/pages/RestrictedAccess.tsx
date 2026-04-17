import { ShieldOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/Shared";

export default function RestrictedAccess() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-rose-900/20 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <ShieldOff className="w-12 h-12" />
      </div>
      <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
        Access Restricted
      </h1>
      <p className="text-slate-400 max-w-md mx-auto mb-6">
        You do not have sufficient permissions to access this module. Contact
        your system administrator to request elevated access.
      </p>
      <Button variant="secondary" onClick={() => navigate("/")}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Button>
    </div>
  );
}
