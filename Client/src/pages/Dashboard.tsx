import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { CardContent, CardHeader, CardTitle, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Briefcase, Clock, CheckCircle, XCircle, LogOut, Loader2, TrendingUp, Users, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { caseService } from "@/services/caseService";
import { CreditCase, Company, DashboardStats } from "@/types/creditCase";
import { useToast } from "@/components/ui/use-toast";
import ActivityFeed from "@/components/ActivityFeed";
import { activityService, ActivityLog } from "@/services/activityService";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { state: workflowState, setSelectedCompanyId, setSelectedCaseId } = useWorkflow();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<CreditCase[]>([]);
  const [companies, setCompanies] = useState<Map<string, Company>>(new Map());
  const [camStatus, setCamStatus] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const casesData = await caseService.getAllCases();
      const companiesData = await caseService.getAllCompanies();
      const companiesMap = new Map(companiesData.map(c => [c._id, c]));
      setCompanies(companiesMap);

      const camStatusMap = new Map();
      for (const caseItem of casesData) {
        try {
          const camReports = await caseService.getCAMReports(caseItem._id);
          camStatusMap.set(caseItem._id, camReports.length > 0 ? "Generated" : "Pending");
        } catch (error) {
          camStatusMap.set(caseItem._id, "Pending");
        }
      }
      setCamStatus(camStatusMap);

      const enrichedCases = casesData.map(caseItem => ({
        ...caseItem,
        companyName: companiesMap.get(caseItem.companyId)?.companyName || "Unknown Company",
        sector: companiesMap.get(caseItem.companyId)?.sector || "Unknown Sector",
        camStatus: camStatusMap.get(caseItem._id) || "Pending",
      }));

      setCases(enrichedCases);
      setStats(caseService.calculateStats(enrichedCases));
      const logsData = await activityService.getGlobalLogs(10);
      setLogs(logsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c =>
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.sector?.toLowerCase().includes(search.toLowerCase()) ||
    c.loanPurpose?.toLowerCase().includes(search.toLowerCase())
  );

  const statsCards = [
    { label: "Active Pipelines", value: stats.totalCases, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
    { label: "Under Review", value: stats.underReview, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", trend: "Normal" },
    { label: "Total Approvals", value: stats.approved, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", trend: "98% Acc." },
    { label: "High Risk/Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", trend: "-5% MoM" },
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
          <p className="text-sm font-medium text-slate-500">Synchronizing intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            {stats.totalCases} credit cases under management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-200 hover:bg-slate-50" onClick={fetchDashboardData}>
            Refresh Data
          </Button>
          <Button className="btn-primary" onClick={() => navigate("/create-case")}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Credit Case
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, i) => (
          <div key={i} className="card-premium p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-medium bg-white text-slate-500">
                {stat.trend}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold text-slate-900">{stat.value}</span>
                <span className="text-xs font-medium text-slate-400">cases</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Table */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Active cases
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search cases, sectors..."
                className="pl-10 w-72 h-10 input-premium bg-white/50 backdrop-blur-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="card-premium">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">Borrower Entity</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => (
                  <TableRow 
                    key={c._id} 
                    className="group cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => {
                      setSelectedCompanyId(c.companyId);
                      setSelectedCaseId(c._id);
                      navigate(`/cases/${c._id}`);
                    }}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{c.companyName}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{c.sector}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">₹{(c.loanRequestAmount || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{c.caseType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                        {c.loanPurpose?.length > 20 ? c.loanPurpose.substring(0, 20) + "..." : c.loanPurpose}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.riskScore ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-12 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-1000", 
                                c.riskScore >= 70 ? "bg-emerald-500" : c.riskScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                              )} 
                              style={{ width: `${c.riskScore}%` }} 
                            />
                          </div>
                          <span className={cn("text-xs font-bold", 
                            c.riskScore >= 70 ? "text-emerald-600" : c.riskScore >= 40 ? "text-amber-600" : "text-rose-600"
                          )}>
                            {c.riskScore}
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-400">Not analyzed</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("px-2 py-0.5 font-bold",
                        c.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        c.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        c.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-slate-50 text-slate-700 border-slate-100'
                      )}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group-hover:bg-white transition-colors">
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCases.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Briefcase className="h-8 w-8 text-slate-200" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">No pipelines active</h4>
                <p className="text-sm text-slate-500 max-w-[240px] text-center mt-1">
                  Start by initializing a new credit case for analysis.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Activity Logs */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Live Feed
            </h3>
            <Button 
              variant="link" 
              className="px-0 text-primary font-bold text-xs uppercase tracking-wider"
              onClick={() => navigate("/activity-log")}
            >
              Log Hub
            </Button>
          </div>
          <div className="card-premium h-[600px] flex flex-col">
            <div className="p-4 border-b bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global Trace Log</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <ActivityFeed logs={logs} loading={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;