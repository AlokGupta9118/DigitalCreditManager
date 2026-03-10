import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { caseService } from "@/services/caseService";
import { activityService, ActivityLog } from "@/services/activityService";
import { CreditCase } from "@/types/creditCase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, FileText, Info, Target, Users,
  Activity, ShieldCheck, IndianRupee, MapPin, Phone,
  Mail, Calendar, Briefcase, FileCode
} from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import ResearchAgent from "./ResearchAgent";
import RiskScoring from "./RiskScoring";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import ActivityFeed from "@/components/ActivityFeed";

const CaseDetails = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CreditCase | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-sm py-4 z-50 -mx-4 px-4 border-b border-slate-200 lg:static lg:bg-transparent lg:p-0 lg:border-none">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="rounded-full h-10 w-10 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{caseData.companyName || caseData.borrowerName}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                {caseId?.substring(0, 8)}...
              </Badge>
              • {caseData.caseType} • Managed by AI Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={
            caseData.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
              caseData.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                caseData.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-slate-100 text-slate-800 border-slate-200'
          }>
            {caseData.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/recommendation?caseId=${caseId}`)}
            className="hidden sm:flex"
          >
            Go to Recommendation
          </Button>
        </div>
      </div>

      {/* Pipeline Progress Indicator */}
      <WorkflowProgress caseId={caseId!} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6 space-x-6">
              {[
                { id: 'details', label: 'Case Details', icon: Info },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'analysis', label: 'AI research', icon: Target },
                { id: 'risk', label: 'Risk Scoring', icon: ShieldCheck },
                { id: 'parties', label: 'Parties', icon: Users },
                { id: 'activity', label: 'Activity', icon: Activity },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-blue-600 transition-all"
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loan Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Request Amount</p>
                          <p className="text-xl font-bold text-slate-900 text-indigo-600">₹{(caseData.loanRequestAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tenure (Months)</p>
                          <p className="font-semibold text-slate-900">{caseData.tenureMonths || 12} Months</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                          <Target className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Purpose</p>
                          <p className="font-semibold text-slate-900">{caseData.loanPurpose}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Case Type</p>
                          <p className="font-semibold text-slate-900">{caseData.caseType}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Professional Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Industry / Sector</p>
                      <p className="font-medium text-slate-900">{caseData.industry || caseData.sector || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Sub-Sector</p>
                      <p className="font-medium text-slate-900 text-xs">{caseData.sector || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Created At</p>
                      <p className="font-medium text-slate-900">{new Date(caseData.createdAt).toLocaleDateString()} {new Date(caseData.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Last System Update</p>
                      <p className="font-medium text-slate-900">{new Date(caseData.updatedAt).toLocaleDateString()} {new Date(caseData.updatedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0">
              <DocumentUpload caseId={caseId} />
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-0">
              <ResearchAgent
                creditCaseId={caseId || ""}
                companyName={caseData?.companyName || caseData?.borrowerName || ""}
                promoterNames={caseData?.promoterNames || []}
                sector={caseData?.sector || ""}
              />
            </TabsContent>

            {/* Risk Tab */}
            <TabsContent value="risk" className="mt-0">
              <RiskScoring
                selectedCaseId={caseId}
                onCaseSelect={() => { }} // No-op as we are already on a case
              />
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Promoters & Directors</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-semibold tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Name</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Relationship</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 italic">
                        {caseData.promoterNames && caseData.promoterNames.length > 0 ? (
                          caseData.promoterNames.map((name, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
                              <td className="px-6 py-4">Promoter/Director</td>
                              <td className="px-6 py-4">Primary Shareholder</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                              No promoters found for this entity
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Case Action Logs</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate("/activity-log")}>
                    Detailed View
                  </Button>
                </CardHeader>
                <CardContent className="p-8">
                  <ActivityFeed logs={logs} loading={false} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary & Insights */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Overall Risk Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold">
                  {caseData.riskScore || '—'}
                </span>
                <span className="text-slate-400 mb-1">/100</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full opacity-100 ${(caseData.riskScore || 0) >= 70 ? 'bg-green-500' :
                        (caseData.riskScore || 0) >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                      }`}
                    style={{ width: `${caseData.riskScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {(caseData.riskScore || 0) >= 70 ? 'High confidence credit profile' :
                    (caseData.riskScore || 0) >= 40 ? 'Moderate credit risk - further review advised' :
                      'High credit risk detected'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" className="w-full justify-start text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-none" onClick={() => navigate(`/recommendation?caseId=${caseId}`)}>
                <IndianRupee className="h-4 w-4 mr-2" />
                View Decision
              </Button>
              <Button size="sm" className="w-full justify-start text-orange-600 bg-orange-50 hover:bg-orange-100 border-none" onClick={() => navigate(`/cam-generator?caseId=${caseId}`)}>
                <FileCode className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetails;