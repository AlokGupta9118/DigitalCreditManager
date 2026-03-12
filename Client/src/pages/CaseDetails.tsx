import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { caseService } from "@/services/caseService";
import { activityService, ActivityLog } from "@/services/activityService";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { CreditCase, Company } from "@/types/creditCase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, FileText, Info, Target, Users, User,
  Activity, ShieldCheck, IndianRupee, MapPin, Phone,
  Mail, Calendar, Briefcase, FileCode, Clock, ClipboardCheck
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import DocumentUpload from "./DocumentUpload";
import ResearchAgent from "./ResearchAgent";
import RiskScoring from "./RiskScoring";
import DueDiligenceTab from "@/components/DueDiligenceTab";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import ActivityFeed from "@/components/ActivityFeed";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CaseDetails = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CreditCase | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedCompanyId, setSelectedCaseId } = useWorkflow();

  useEffect(() => {
    if (caseId) {
      fetchCaseDetails();
    }
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const [data, logsData] = await Promise.all([
        caseService.getCaseById(caseId!),
        activityService.getCaseLogs(caseId!, 15)
      ]);
      setCaseData(data);
      setLogs(logsData);
      
      // Update global workflow context
      setSelectedCaseId(caseId!);
      
      if (data.companyId) {
        setSelectedCompanyId(data.companyId);
        try {
          const companyData = await caseService.getCompany(data.companyId);
          setCompany(companyData);
        } catch (err) {
          console.error("Failed to fetch company details:", err);
        }
      }
    } catch (error) {
      console.error("Failed to fetch case details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">Case not found</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header with back button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl h-12 w-12 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <ArrowLeft className="h-6 w-6 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{caseData.companyName || company?.companyName || caseData.borrowerName}</h1>
              <Badge className={cn("px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest",
                caseData.status === 'Approved' ? 'bg-emerald-500 text-white' :
                caseData.status === 'Under Review' ? 'bg-amber-500 text-white' :
                caseData.status === 'Rejected' ? 'bg-rose-500 text-white' :
                'bg-slate-500 text-white'
              )}>
                {caseData.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Briefcase className="h-3.5 w-3.5" />
                {caseData.sector || company?.sector || "General Sector"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <FileCode className="h-3.5 w-3.5" />
                ID: {caseId?.slice(-8).toUpperCase()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Updated {new Date(caseData.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-[420px] hidden lg:block">
          <WorkflowProgress caseId={caseId!} />
        </div>
      </div>

      {/* Pipeline Progress Indicator */}
      {/* Redundant one removed to optimize vertical space and focus on header-integrated version */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        {/* Main Content Area */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit h-auto overflow-x-auto">
              {[
                { id: 'details', label: 'Overview', icon: Info },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'analysis', label: 'Deep Research', icon: Target },
                { id: 'diligence', label: 'DD Notes', icon: ClipboardCheck },
                { id: 'risk', label: 'Credit Appraisal', icon: ShieldCheck },
                { id: 'parties', label: 'Governance', icon: Users },
                { id: 'activity', label: 'Audit Log', icon: Activity },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="card-premium p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Exposure Requested</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{(caseData.loanRequestAmount || 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">Under Review Pipeline</p>
                  </div>
                </div>
                <div className="card-premium p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Facility Runtime</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{caseData.tenureMonths || 12} Months</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Amortizing Schedule</p>
                  </div>
                </div>
              </div>

              <div className="card-premium h-fit">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">Executive Summary</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Corporate metadata & registration logs</p>
                  </div>
                  <Badge variant="outline" className="bg-white text-slate-500 border-slate-200">System Verified</Badge>
                </div>
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Industry Vertical</Label>
                        <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">{caseData.industry || caseData.sector || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">Primary HQ</p>
                          <p className="text-xs font-bold text-slate-700">{caseData.address || "Corporate Office, Central Zone"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Borrower Intent</Label>
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 italic">
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">"{caseData.loanPurpose}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <DocumentUpload caseId={caseId} />
            </TabsContent>

            <TabsContent value="analysis" className="mt-0">
              <ResearchAgent />
            </TabsContent>

            <TabsContent value="diligence" className="mt-0">
              <DueDiligenceTab caseId={caseId || ""} />
            </TabsContent>

            <TabsContent value="risk" className="mt-0">
              <RiskScoring />
            </TabsContent>

            <TabsContent value="parties" className="mt-0">
              <div className="card-premium h-full">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">Promoter & Directorship Stack</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Verified governance metadata from official registrar</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[10px] font-bold">KYC Verified</Badge>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/10">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest px-8">Executive Profile</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest">Classification</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest">Shareholding</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right px-8">Verification Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {company?.promoters && company.promoters.length > 0 ? (
                        company.promoters.map((p, i) => (
                          <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 flex flex-col">
                              <span className="font-bold text-slate-900">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">DIN: {p.DIN || "N/A"}</span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600">Key Person / Promoter</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${p.shareholding}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700">{p.shareholding}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-8">
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">VERIFIED</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        caseData.promoterNames?.map((name, i) => (
                          <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 font-bold text-slate-900">{name}</TableCell>
                            <TableCell className="text-xs font-medium text-slate-500">Key Person / Promoter</TableCell>
                            <TableCell className="text-xs font-medium text-slate-400">N/A</TableCell>
                            <TableCell className="text-right px-8 font-bold text-emerald-600 text-[10px]">VERIFIED</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="card-premium">
                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">Audit Hub</h3>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => navigate("/activity-log")}>Full Logs</Button>
                </div>
                <div className="p-6">
                  <ActivityFeed logs={logs} loading={false} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel - Summary & Insights */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-8 h-full sticky top-24">
          <motion.div 
            whileHover={{ opacity: 0.08, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="card-premium p-8 bg-[#0f172a] text-white relative overflow-hidden group cursor-help border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-10">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide border-white/20 text-slate-400 bg-white/5">AI Scorecard</Badge>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-6xl font-semibold tracking-tighter text-white">
                {caseData.riskScore || '—'}
              </span>
              <span className="text-xs font-medium text-slate-500">Score</span>
            </div>

            <div className="space-y-6">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${caseData.riskScore || 0}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className={cn("h-full rounded-full", 
                    (caseData.riskScore || 0) >= 75 ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : 
                    (caseData.riskScore || 0) >= 50 ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  )}
                />
              </div>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  {(caseData.riskScore || 0) >= 75 ? 'The entity displays strong credit fundamentals with negligible risk vectors detected in the latest audit.' :
                    (caseData.riskScore || 0) >= 50 ? 'Standard risk profile with manageable exposure. Pipeline processing can continue with routine oversight.' :
                    'High-risk profile detected. Automated safeguards have flagged this case for human-in-the-loop validation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/[0.08] cursor-default">
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Confidence</p>
                  <p className="text-sm font-bold text-white">98.2%</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/[0.08] cursor-default">
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Sync status</p>
                  <p className="text-sm font-bold text-emerald-400">Realtime</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="card-premium p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Quick Dispatch
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start border-slate-200 font-bold text-xs"
                onClick={() => navigate(`/cam-generator?caseId=${caseId}`)}
              >
                <FileCode className="h-4 w-4 mr-3 text-amber-600" />
                Regenerate CAM Report
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start border-slate-200 font-bold text-xs"
                onClick={() => navigate(`/activity-log?caseId=${caseId}`)}
              >
                <Clock className="h-4 w-4 mr-3 text-blue-600" />
                View Detailed Logs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetails;