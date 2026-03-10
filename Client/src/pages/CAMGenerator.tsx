import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText, Download, CheckCircle, Loader2, AlertCircle,
  FileType, Building2, LockKeyhole, XCircle
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { camService, CamReport } from "@/services/camService";
import { caseService } from "@/services/caseService";
import { riskService } from "@/services/riskService";
import { companyService, Company } from "@/services/companyService";
import { recommendationService, FinalizeStatus } from "@/services/recommendationService";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCase } from "@/types/creditCase";

const BACKEND_URL = "http://localhost:8000";

const CAMGenerator = () => {
  const { state, setSelectedCompanyId, setSelectedCaseId } = useWorkflow();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [reports, setReports] = useState<CamReport[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [cases, setCases] = useState<CreditCase[]>([]);

  const selectedCompanyId = state.selectedCompanyId || "";
  const caseId = state.selectedCaseId || "";

  // Pipeline status
  const [researchReady, setResearchReady] = useState(false);
  const [riskReady, setRiskReady] = useState(false);
  const [recReady, setRecReady] = useState(false);
  const [recFinalized, setRecFinalized] = useState(false);
  const [finalizeStatus, setFinalizeStatus] = useState<FinalizeStatus | null>(null);
  const [runningRec, setRunningRec] = useState(false);

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { if (selectedCompanyId) fetchCases(selectedCompanyId); }, [selectedCompanyId]);
  useEffect(() => { if (caseId) { fetchReports(); checkPipelineStatus(); } }, [caseId]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (e) { console.error(e); }
  };

  const fetchCases = async (companyId: string) => {
    try {
      const data = await caseService.getCasesByCompany(companyId);
      setCases(data);
      if (data.length > 0 && !state.selectedCaseId) {
        setSelectedCaseId(data[0]._id);
      }
    } catch (e) { console.error(e); }
  };

  const checkPipelineStatus = useCallback(async () => {
    if (!caseId) return;
    try {
      // Research
      const researchStatus = await caseService.getResearchStatus(caseId);
      setResearchReady(researchStatus.exists && researchStatus.status === "COMPLETED");

      // Risk
      try {
        const risk = await riskService.getLatestRiskByCase(caseId);
        setRiskReady(risk.status === "COMPLETED");
      } catch { setRiskReady(false); }

      // Recommendation
      try {
        const rec = await recommendationService.getLatestRecommendationByCase(caseId);
        setRecReady(!!rec);
      } catch { setRecReady(false); }

      // Finalize status
      try {
        const fs = await recommendationService.getFinalizeStatus(caseId);
        setFinalizeStatus(fs);
        setRecFinalized(fs.finalized);
      } catch { setRecFinalized(false); setFinalizeStatus(null); }

    } catch (error) {
      console.error("Error checking pipeline status", error);
    }
  }, [caseId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await camService.getCamReportsByCase(caseId!);
      setReports(data);
    } catch { /* 404 is fine */ } finally { setLoading(false); }
  };

  const handleRunRecommendation = async () => {
    if (!caseId) return;
    try {
      setRunningRec(true);
      await recommendationService.runRecommendationAgent(caseId);
      toast({ title: "Success", description: "AI Recommendation generated!" });
      setRecReady(true);
      await checkPipelineStatus();
    } catch {
      toast({ title: "Recommendation failed", description: "Ensure Risk Assessment is completed first.", variant: "destructive" });
    } finally {
      setRunningRec(false);
    }
  };

  const handleGenerateCam = async (format: 'pdf' | 'docx') => {
    if (!caseId) return;
    try {
      if (format === 'docx') setGeneratingDocx(true);
      else setDownloading(true);

      const res = format === 'docx'
        ? await camService.generateDocxCam(caseId)
        : await camService.generateCam(caseId);

      toast({
        title: "Report generated!",
        description: format === 'docx' ? "Professional Credit Memo (DOCX) is ready." : "PDF Report generated."
      });
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Ensure Risk and Recommendation are completed first.",
        variant: "destructive",
      });
    } finally {
      setGeneratingDocx(false);
      setDownloading(false);
    }
  };

  const downloadReport = (reportUrl: string, format: string) => {
    // reportUrl is now just 'reports/filename.ext' (no double prefix)
    const fullUrl = `${BACKEND_URL}/${reportUrl}`;
    // Force download for docx, open in tab for pdf
    if (format === 'docx') {
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = reportUrl.split('/').pop() || 'report.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  const pipelineOk = researchReady && riskReady && recReady;
  const canGenerate = recFinalized;

  const statusRow = (
    label: string,
    sublabel: string,
    ready: boolean,
    action?: React.ReactNode
  ) => (
    <div className="flex items-center justify-between p-4 bg-white/50">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${ready ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
          {ready ? <CheckCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      {action ?? (
        <Badge variant={ready ? "secondary" : "outline"} className={ready ? "bg-success/10 text-success border-success/20" : ""}>
          {ready ? "Ready" : "Pending"}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="gradient-primary-light rounded-xl p-6">
        <h2 className="text-lg font-semibold">Credit Appraisal Memo Generator</h2>
        <p className="text-sm text-muted-foreground">Generate professional Credit Memo in Word or PDF. Requires officer approval first.</p>
      </div>

      {/* Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Select Business Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Company</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c._id} value={c._id || ""}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCompanyId && (
              <div>
                <label className="text-xs font-medium mb-1 block">Credit Case</label>
                <Select value={caseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger><SelectValue placeholder="Select a case" /></SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.loanPurpose} — ₹{(c.loanRequestAmount || 0).toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Status */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                AI Output Aggregation Status
              </CardTitle>
              <CardDescription>All steps must be complete before CAM generation is enabled</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={checkPipelineStatus} disabled={!caseId}>
              <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {statusRow("Research Agent", "Market data, financials, legal check", researchReady)}
            {statusRow("Risk Scoring Agent", "7-category weighted scorecard", riskReady)}
            {statusRow(
              "Lending Recommendation",
              "Final decision & interest rate",
              recReady,
              recReady ? (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">Ready</Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs gradient-primary border-0"
                  disabled={!riskReady || runningRec}
                  onClick={handleRunRecommendation}
                >
                  {runningRec ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  {runningRec ? "Running..." : "Run AI Rec"}
                </Button>
              )
            )}
            {/* Finalize gate row */}
            {statusRow(
              "Officer Finalization",
              "Credit officer must Accept or Override before CAM generation",
              recFinalized,
              recFinalized ? (
                <Badge variant="secondary" className={`border ${finalizeStatus?.finalStatus === "APPROVED" ? "bg-green-100 text-green-800 border-green-300" :
                    finalizeStatus?.finalStatus === "REJECTED" ? "bg-red-100 text-red-800 border-red-300" :
                      "bg-blue-100 text-blue-800 border-blue-300"
                  }`}>
                  {finalizeStatus?.finalStatus || "Finalized"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-500 border-orange-300 bg-orange-50">
                  <LockKeyhole className="h-3 w-3 mr-1" />
                  Awaiting Officer
                </Badge>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and download previously generated reports for this case.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report._id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{report.caseName} - CAM ({report.format?.toUpperCase()})</p>
                    <p className="text-xs text-muted-foreground">{new Date(report.generatedAt).toLocaleString()}</p>
                    {(report as any).finalDecision && (
                      <p className="text-xs text-green-700 font-medium">Decision: {(report as any).finalDecision}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadReport(report.reportUrl, report.format)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          )}

          {/* Generate buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleGenerateCam('pdf')}
              disabled={downloading || !canGenerate}
            >
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Standard PDF Report
            </Button>

            <Button
              className="gradient-primary border-0 w-full"
              onClick={() => handleGenerateCam('docx')}
              disabled={generatingDocx || !canGenerate}
            >
              {generatingDocx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileType className="mr-2 h-4 w-4" />}
              {generatingDocx ? "Generating DOCX..." : "Professional Credit Memo"}
            </Button>
          </div>

          {!canGenerate && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg text-warning text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                {!pipelineOk
                  ? "Complete Research → Risk → Recommendation before generating the Credit Memo."
                  : "The credit recommendation must be accepted or overridden by a credit officer in the Loan Recommendation page before generating the CAM."
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CAMGenerator;
