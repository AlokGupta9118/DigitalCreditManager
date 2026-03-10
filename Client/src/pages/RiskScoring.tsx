import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Building2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { riskService, type RiskScore } from "@/services/riskService";
import { companyService, type Company } from "@/services/companyService";
import { caseService } from "@/services/caseService";
import { type CreditCase } from "@/types/creditCase";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/contexts/WorkflowContext";

export function RiskScoring({
  onScoreComplete,
}: { onScoreComplete?: (score: RiskScore) => void }) {
  const { state, setSelectedCompanyId, setSelectedCaseId, setActiveRiskId } = useWorkflow();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cases, setCases] = useState<CreditCase[]>([]);
  
  const selectedCompanyId = state.selectedCompanyId || "";
  const selectedCaseId = state.selectedCaseId || "";

  const [researchStatus, setResearchStatus] = useState<{
    exists: boolean;
    status?: string;
  }>({ exists: false });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout>();

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Sync cases when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      loadCasesByCompany(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // Load data when case is selected
  useEffect(() => {
    if (selectedCaseId) {
      loadRiskScore(selectedCaseId);
      checkResearchStatus(selectedCaseId);
      
      // Resume polling if activeRiskId exists for this case
      if (state.activeRiskId) {
        setProcessing(true);
        startPolling(state.activeRiskId, selectedCaseId);
      }
    }
  }, [selectedCaseId, state.activeRiskId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    }
  };

  const loadCasesByCompany = async (companyId: string) => {
    try {
      setLoading(true);
      const data = await caseService.getCasesByCompany(companyId);
      setCases(data);
      
      // Auto-select the latest case if available and none selected
      if (data && data.length > 0 && !selectedCaseId) {
        const latestCase = data[0];
        setSelectedCaseId(latestCase._id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRiskScore = async (caseId: string) => {
    try {
      setLoading(true);
      const score = await riskService.getLatestRiskByCase(caseId);
      setRiskScore(score);
    } catch (error) {
      // 404 means no risk score yet - that's fine
      setRiskScore(null);
    } finally {
      setLoading(false);
    }
  };

  const checkResearchStatus = async (caseId: string) => {
    try {
      const status = await caseService.getResearchStatus(caseId);
      setResearchStatus(status);
    } catch (error) {
      setResearchStatus({ exists: false });
    }
  };

  const handleRunRiskAssessment = async () => {
    if (!selectedCaseId) {
      toast({
        title: "No Case Selected",
        description: "Please select a credit case first",
        variant: "destructive",
      });
      return;
    }

    // Check if research exists
    if (!researchStatus.exists) {
      toast({
        title: "Research Required",
        description: "Please run the research agent first to generate a research report",
        variant: "destructive",
      });
      return;
    }

    if (researchStatus.status !== "COMPLETED") {
      toast({
        title: "Research In Progress",
        description: "Please wait for the research to complete before running risk assessment",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      
      const result = await riskService.runRiskAgent(selectedCaseId);
      
      toast({
        title: "Risk Assessment Started",
        description: result.message || "Processing in background...",
      });
      
      if (result.riskId) {
        setActiveRiskId(result.riskId);
        startPolling(result.riskId, selectedCaseId);
      } else {
        startPolling("latest", selectedCaseId);
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start risk assessment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const startPolling = (riskId: string, caseId: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const { status, message } = await riskService.getRiskStatus(riskId === "latest" ? "" : riskId);
        
        if (status === "COMPLETED") {
          const score = await riskService.getLatestRiskByCase(caseId);
          setRiskScore(score);
          setProcessing(false);
          setActiveRiskId(null);
          clearInterval(interval);
          
          toast({
            title: "Success",
            description: "Risk assessment completed",
          });
          
          if (onScoreComplete) {
            onScoreComplete(score);
          }
        } else if (status === "ERROR") {
          setProcessing(false);
          setActiveRiskId(null);
          clearInterval(interval);
          
          // Load the latest record to get the error message
          const score = await riskService.getLatestRiskByCase(caseId);
          setRiskScore(score);
          
          toast({
            title: "Assessment Failed",
            description: message || "Check the scorecard for details",
            variant: "destructive",
          });
        }
      } catch (error) {
        // Continue polling on minor errors
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const handleCaseSelect = async (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const getRiskColor = (grade?: string) => {
    if (!grade) return "bg-gray-500";
    if (grade.includes("AAA") || grade.includes("AA")) return "bg-green-500";
    if (grade.includes("A") || grade.includes("BBB")) return "bg-yellow-500";
    if (grade.includes("BB") || grade.includes("B")) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreIcon = (score?: number) => {
    if (!score) return <Minus className="h-5 w-5" />;
    if (score >= 70) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (score >= 50) return <Minus className="h-5 w-5 text-yellow-500" />;
    return <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-500">Processing</Badge>;
      case "ERROR":
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const formatScorecard = (text?: string) => {
    if (!text) return null;
    
    // Split by sections and format
    const lines = text.split("\n");
    return lines.map((line, index) => {
      if (line.includes("OVERALL SCORE:")) {
        return (
          <div key={index} className="text-lg font-bold text-primary mt-2">
            {line}
          </div>
        );
      } else if (line.includes("CREDIT RATING:")) {
        return (
          <div key={index} className="text-lg font-semibold text-blue-600">
            {line}
          </div>
        );
      } else if (line.includes("RED FLAGS")) {
        return (
          <div key={index} className="font-bold text-red-600 mt-4">
            {line}
          </div>
        );
      } else if (line.includes("LENDING RECOMMENDATION")) {
        return (
          <div key={index} className="font-bold text-green-600 mt-4">
            {line}
          </div>
        );
      } else if (line.includes("Decision: APPROVE")) {
        return (
          <div key={index} className="text-green-600 font-semibold">
            {line}
          </div>
        );
      } else if (line.includes("Decision: REJECT")) {
        return (
          <div key={index} className="text-red-600 font-semibold">
            {line}
          </div>
        );
      } else if (line.includes("══════════════════════════════════")) {
        return <Separator key={index} className="my-2" />;
      } else if (line.trim() === "") {
        return <div key={index} className="h-2" />;
      }
      return <div key={index} className="text-sm">{line}</div>;
    });
  };

  return (
    <div className="space-y-4">
      {/* Company and Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Credit Case
          </CardTitle>
          <CardDescription>
            Choose a company and case to run risk assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Company</label>
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company._id} value={company._id || ""}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCaseId && (
              <div className="flex flex-col justify-end">
                <div className="p-2 border rounded-md bg-muted/30">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Selected Case</div>
                  <div className="text-sm font-medium truncate">
                    {cases.find(c => c._id === selectedCaseId)?.borrowerName || "Unnamed Case"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    ID: {selectedCaseId.slice(-8)} • {cases.find(c => c._id === selectedCaseId)?.loanPurpose || "General"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedCaseId && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Research Status: 
                </span>
                {researchStatus.exists ? (
                  researchStatus.status === "COMPLETED" ? (
                    <Badge className="bg-green-500">Completed</Badge>
                  ) : (
                    <Badge className="bg-yellow-500">In Progress</Badge>
                  )
                ) : (
                  <Badge variant="outline">Not Started</Badge>
                )}
              </div>
              
              <Button
                onClick={handleRunRiskAssessment}
                disabled={processing || !researchStatus.exists || researchStatus.status !== "COMPLETED"}
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Run Risk Assessment
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Score Display */}
      {selectedCaseId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Credit Risk Assessment</CardTitle>
                {riskScore && getStatusBadge(riskScore.status)}
              </div>
              {riskScore && riskScore.status === "COMPLETED" && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : riskScore ? (
              <Tabs defaultValue="scorecard">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="scorecard" className="mt-4">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    {riskScore.scorecardText ? (
                      <div className="font-mono text-sm space-y-1">
                        {formatScorecard(riskScore.scorecardText)}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No scorecard text available
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="summary" className="mt-4">
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        {getScoreIcon(riskScore.overallScore)}
                        <div>
                          <div className="text-sm text-muted-foreground">Overall Score</div>
                          <div className="text-2xl font-bold">
                            {riskScore.overallScore?.toFixed(1) || "N/A"}/100
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Risk Grade</div>
                        <Badge className={`${getRiskColor(riskScore.riskGrade)} text-white`}>
                          {riskScore.riskGrade || "N/A"}
                        </Badge>
                      </div>
                    </div>

                    {/* New Category Scores */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Category Scores</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Financial Health</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.financialHealthScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 30%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Credit Rating</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.creditRatingScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 15%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Promoter Background</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.promoterBackgroundScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 15%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Regulatory Compliance</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.regulatoryComplianceScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 10%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Litigation Risk</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.litigationRiskScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 10%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Sector & Market Position</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.sectorPositionScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 10%</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">ESG & Irregularities</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-lg">{riskScore.esgIrregularitiesScore ?? 0}/100</div>
                            <div className="text-xs text-muted-foreground">Weight: 10%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-muted-foreground">
                      {riskScore.createdAt && (
                        <div>Created: {new Date(riskScore.createdAt).toLocaleString()}</div>
                      )}
                      {riskScore.updatedAt && (
                        <div>Updated: {new Date(riskScore.updatedAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No risk assessment available for this case</p>
                <p className="text-sm">Click "Run Risk Assessment" to generate one</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RiskScoring;