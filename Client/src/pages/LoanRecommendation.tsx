import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/data/mockData";
import {
  CheckCircle, AlertTriangle, IndianRupee, Percent, Shield, MessageSquare,
  Loader2, RefreshCw, LockKeyhole, XCircle
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { recommendationService, Recommendation, FinalizeStatus } from "@/services/recommendationService";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { companyService, Company } from "@/services/companyService";
import { caseService } from "@/services/caseService";
import { CreditCase } from "@/types/creditCase";

const recColors = {
  "Approve": "bg-success/10 text-success border-success",
  "Approve with Conditions": "bg-warning/10 text-warning border-warning",
  "Reject": "bg-destructive/10 text-destructive border-destructive",
};

const LoanRecommendation = () => {
  const { state, setSelectedCompanyId, setSelectedCaseId } = useWorkflow();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [recData, setRecData] = useState<Recommendation | null>(null);
  const [finalizeStatus, setFinalizeStatus] = useState<FinalizeStatus | null>(null);
  const [override, setOverride] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [cases, setCases] = useState<CreditCase[]>([]);
  const selectedCompanyId = state.selectedCompanyId || "";
  const caseId = state.selectedCaseId || "";

  useEffect(() => { fetchCompanies(); }, []);

  useEffect(() => {
    if (selectedCompanyId) fetchCases(selectedCompanyId);
  }, [selectedCompanyId]);

  useEffect(() => {
    if (caseId) {
      fetchRecommendation();
      fetchFinalizeStatus();
    } else {
      setRecData(null);
      setFinalizeStatus(null);
    }
  }, [caseId]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies", error);
    }
  };

  const fetchCases = async (companyId: string) => {
    try {
      const data = await caseService.getCasesByCompany(companyId);
      setCases(data);
    } catch (error) {
      console.error("Failed to fetch cases", error);
    }
  };

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const data = await recommendationService.getLatestRecommendationByCase(caseId);
      setRecData(data);
    } catch {
      setRecData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalizeStatus = async () => {
    try {
      const status = await recommendationService.getFinalizeStatus(caseId);
      setFinalizeStatus(status);
    } catch {
      setFinalizeStatus(null);
    }
  };

  const handleRunRecommendation = async () => {
    if (!caseId) {
      toast({ title: "Case Required", description: "Please select a case first", variant: "destructive" });
      return;
    }
    try {
      setRunning(true);
      const res = await recommendationService.runRecommendationAgent(caseId);
      toast({ title: "Recommendation Generated", description: res.message });
      await fetchRecommendation();
      await fetchFinalizeStatus();
    } catch (error: any) {
      toast({
        title: "Error generating recommendation",
        description: error.message || "Failed to start agent. Ensure Risk Assessment is completed.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleFinalize = async (decision: string) => {
    if (!caseId || !recData) return;
    if (!decision) return;

    try {
      setFinalizing(true);
      const res = await recommendationService.finalizeRecommendation(caseId, {
        decision,
        amount: recData.suggestedLoanAmount,
        rate: recData.interestRate,
        comments: override,
      });

      toast({ title: "Decision Finalized", description: res.message });

      // Refresh finalize status and recommendation
      await fetchFinalizeStatus();
      await fetchRecommendation();
      setOverride("");
    } catch (error: any) {
      toast({
        title: "Finalization Failed",
        description: error.message || "Failed to record decision",
        variant: "destructive",
      });
    } finally {
      setFinalizing(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!recData) {
      return (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Recommendation Found</h3>
            <p className="text-muted-foreground mb-6">Generate a final credit recommendation based on the AI Risk Scorecard.</p>
            <Button onClick={handleRunRecommendation} disabled={running || !caseId}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {running ? "Generating Recommendation..." : "Generate Recommendation"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Badge styling
    let badgeStyle = "bg-muted text-muted-foreground border-muted";
    const decisionUpper = recData.decision.toUpperCase();
    if (decisionUpper.includes("CONDITIONAL")) badgeStyle = recColors["Approve with Conditions"];
    else if (decisionUpper.includes("APPROVE")) badgeStyle = recColors["Approve"];
    else if (decisionUpper.includes("REJECT") || decisionUpper.includes("DECLINE")) badgeStyle = recColors["Reject"];

    const isFinalized = finalizeStatus?.finalized;
    const finalStatus = finalizeStatus?.finalStatus;

    return (
      <div className="space-y-6">
        {/* Re-run button (only if not finalized) */}
        {!isFinalized && (
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={handleRunRecommendation} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {running ? "Updating..." : "Re-run Recommendation"}
            </Button>
          </div>
        )}

        {/* Finalized Banner */}
        {isFinalized && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${finalStatus === "APPROVED" ? "border-green-300 bg-green-50" :
              finalStatus === "REJECTED" ? "border-red-300 bg-red-50" :
                "border-blue-300 bg-blue-50"
            }`}>
            {finalStatus === "APPROVED"
              ? <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              : finalStatus === "REJECTED"
                ? <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                : <LockKeyhole className="h-6 w-6 text-blue-600 flex-shrink-0" />
            }
            <div>
              <p className={`font-bold text-base ${finalStatus === "APPROVED" ? "text-green-700" : finalStatus === "REJECTED" ? "text-red-700" : "text-blue-700"}`}>
                Decision Finalized: {finalizeStatus?.finalDecision}
              </p>
              <p className="text-sm text-muted-foreground">
                {finalizeStatus?.finalizedAt ? new Date(finalizeStatus.finalizedAt).toLocaleString() : ""}
                {finalizeStatus?.officerComments ? ` • "${finalizeStatus.officerComments}"` : ""}
              </p>
            </div>
          </div>
        )}

        {/* AI Recommendation Card */}
        <Card className="shadow-card border-2 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">AI Recommendation</div>
            <Badge className={`text-lg px-6 py-2 ${badgeStyle}`}>{decisionUpper}</Badge>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-sm">Suggested Limit</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(recData.suggestedLoanAmount)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Percent className="h-4 w-4" />
                  <span className="text-sm">Interest Rate</span>
                </div>
                <p className="text-2xl font-bold">{recData.interestRate}%</p>
              </div>
            </div>

            {/* Logic Breakdown */}
            <div className="mt-8 pt-6 border-t border-dashed border-primary/20">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center justify-center gap-2">
                <RefreshCw className="h-3 w-3" />
                Mathematical Logic Breakdown
              </h4>
              <div className="bg-primary/5 rounded-lg p-3 text-left">
                <p className="text-xs leading-relaxed text-muted-foreground italic">
                  The loan limit is calculated by applying a risk-adjusted haircut to the requested amount (or financial cap like 3x EBITDA/20% Revenue), further adjusted by site visit credibility scores. Interest rate is derived from a base of 9% plus a risk-grade premium.
                </p>
                {recData.reasoning?.find(r => r.includes("Limit logic")) && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    {recData.reasoning.find(r => r.includes("Limit logic"))}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reasoning */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Decision Reasoning & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recData.reasoning && recData.reasoning.length > 0 ? (
              recData.reasoning.map((reason, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  {reason.toLowerCase().includes("risk") || reason.toLowerCase().includes("slowdown") || reason.toLowerCase().includes("litigation") || reason.toLowerCase().includes("require") || reason.toLowerCase().includes("critical") ? (
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{reason}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3">No specific reasoning provided.</p>
            )}
          </CardContent>
        </Card>

        {/* Officer Action — only shown if NOT yet finalized */}
        {!isFinalized && (
          <Card className="shadow-card">
            <CardHeader><CardTitle>Officer Override / Comments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add your comments or override reasoning..."
                className="min-h-[100px]"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  className="gradient-primary border-0"
                  onClick={() => handleFinalize(recData.decision)}
                  disabled={finalizing}
                >
                  {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Accept Recommendation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFinalize("OVERRIDE: " + (recData.decision.includes("APPROVE") ? "REJECT" : "APPROVE"))}
                  disabled={finalizing || !override.trim()}
                  title={!override.trim() ? "Please add a comment explaining your override" : "Override AI decision"}
                >
                  Override Decision
                </Button>
              </div>
              {!override.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  * Comments are required to override the AI recommendation.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Case Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Select Credit Case
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

      {renderContent()}
    </div>
  );
};

export default LoanRecommendation;
