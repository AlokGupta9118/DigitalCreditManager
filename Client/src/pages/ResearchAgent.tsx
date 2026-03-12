import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Minus,
  FileText,
  ExternalLink,
  Building,
  Scale,
  Gavel,
  Users,
  Target,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { researchService, Research } from "@/services/researchService";
import { companyService, Company } from "@/services/companyService";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { caseService } from "@/services/caseService";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
};

const ResearchAgent = () => {
  const { state, setSelectedCompanyId, setSelectedCaseId, setActiveResearchId } = useWorkflow();
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<Research | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Company selection state
  const [companies, setCompanies] = useState<Company[]>([]);
  const selectedCompanyId = state.selectedCompanyId || "";
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  const { toast } = useToast();

  const creditCaseId = state.selectedCaseId || "";

  // Load companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Sync selectedCompany when selectedCompanyId changes or companies list changes
  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const company = companies.find(c => c._id === selectedCompanyId) || null;
      setSelectedCompany(company);
      
      // If we don't have a case selected yet, auto-select latest
      if (!state.selectedCaseId && company) {
        fetchLatestCase(selectedCompanyId);
      }
    }
  }, [selectedCompanyId, companies]);

  // Load existing research on mount
  useEffect(() => {
    if (creditCaseId) {
      loadLatestResearch();
    }
    
    // Resume polling if we have an active research run recorded in global state
    if (state.activeResearchId) {
      setRunning(true);
      pollForResults(state.activeResearchId);
    }
  }, [creditCaseId, state.activeResearchId]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (error: any) {
      console.error("Failed to load companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchLatestCase = async (companyId: string) => {
    try {
      const cases = await caseService.getCasesByCompany(companyId);
      if (cases && cases.length > 0) {
        // If only one case, auto-select it. Otherwise keep it for user to see
        setSelectedCaseId(cases[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch cases", error);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const loadLatestResearch = async () => {
    try {
      setLoading(true);
      const data = await researchService.getLatestResearch(creditCaseId);
      setResearch(data);
    } catch (error: any) {
      if (error.message?.includes('404')) {
        setResearch(null);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load research",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

const runResearch = async () => {
  if (!selectedCompany) {
    toast({
      title: "Company Required",
      description: "Please select a company to research",
      variant: "destructive",
    });
    return;
  }

  if (!creditCaseId) {
    toast({
      title: "Case Required",
      description: "No active credit case found for this company.",
      variant: "destructive",
    });
    return;
  }

  try {
    setRunning(true);
    const response = await researchService.runResearch(
      creditCaseId,
      selectedCompany.companyName,
      selectedCompany.promoterNames || [],
      selectedCompany.sector
    );
    
    toast({
      title: "Research Started",
      description: response.message,
    });
    
    if (response.id) {
      setActiveResearchId(response.id);
      pollForResults(response.id);
    } else {
      pollForResults();
    }
    
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to start research",
      variant: "destructive",
    });
    setRunning(false);
  }
};

  const pollForResults = async (researchId?: string) => {
    let attempts = 0;
    const maxAttempts = 36;
    
    const interval = setInterval(async () => {
      try {
        attempts++;
        
        let data;
        if (researchId) {
          const statusResult = await researchService.getResearchStatus(researchId);
          if (statusResult.status === "COMPLETED" || statusResult.status === "ERROR") {
             data = await researchService.getLatestResearch(creditCaseId);
          }
        } else {
          data = await researchService.getLatestResearch(creditCaseId);
        }
        
        if (data && data.overallRisk !== "PROCESSING" && data.overallRisk !== "ERROR") {
          setResearch(data);
          setRunning(false);
          setActiveResearchId(null);
          clearInterval(interval);
          toast({
            title: "Research Complete",
            description: "Research has been completed successfully",
          });
        } else if (data && data.overallRisk === "ERROR") {
          setRunning(false);
          setActiveResearchId(null);
          clearInterval(interval);
          toast({
            title: "Research Failed",
            description: data.creditOpinion || "Research encountered an error",
            variant: "destructive",
          });
        }
        
        if (attempts >= maxAttempts) {
          setRunning(false);
          setActiveResearchId(null);
          clearInterval(interval);
          toast({
            title: "Timeout",
            description: "Research is taking longer than expected. Check back later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        // Ignore errors during polling
      }
    }, 5000);
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "LOW": return "text-green-600 bg-green-50 border-green-200";
      case "MEDIUM": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "HIGH": return "text-red-600 bg-red-50 border-red-200";
      case "PROCESSING": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "LOW": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "MEDIUM": return <Minus className="h-4 w-4 text-yellow-600" />;
      case "HIGH": return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "PROCESSING": return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return "text-green-600 bg-green-50";
      case "negative": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading research data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-in"
    >
      {/* Header with company selector */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Credit Research</h2>
        <p className="text-sm text-slate-500">Run AI-powered research on company filings, credit ratings, and legal records.</p>
      </div>

      <Card className="card-premium">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-medium text-slate-500">
                Company
              </label>
              <Select
                value={selectedCompanyId}
                onValueChange={handleCompanyChange}
                disabled={running || loadingCompanies}
              >
                <SelectTrigger className="w-full h-11 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200">
                  {loadingCompanies ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : companies.length > 0 ? (
                    companies.map((company) => (
                      <SelectItem key={company._id} value={company._id || ""} className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">{company.companyName}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground font-medium">
                      No companies found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-16 bg-slate-100 hidden md:block" />

            <div className="flex-1 w-full space-y-2">
               <label className="text-xs font-medium text-slate-500">
                Active case
              </label>
              {selectedCompany?.companyName ? (
                <div className="h-11 px-4 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200/60">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {selectedCompany.companyName}
                    </span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold">Active</Badge>
                </div>
              ) : (
                <div className="h-11 px-4 flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-sm">
                  No case selected
                </div>
              )}
            </div>

            <div className="pt-4 md:pt-0">
               {selectedCompanyId && creditCaseId && !running && (
                <Button 
                  onClick={runResearch} 
                  disabled={running}
                  className="btn-primary h-11 px-6 rounded-lg text-sm font-medium shadow-md"
                >
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : research ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-run Research
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Run Research
                    </>
                  )}
                </Button>
               )}
            </div>
          </div>

          {running && (
            <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
               <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Research in progress</h4>
                    <p className="text-xs text-slate-500">Scanning MCA filings, court records, and market data. This may take 1-2 minutes.</p>
                  </div>
               </div>
               <Progress value={65} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Research State */}
      {!research && !running && (
        <Card className="card-premium border-none py-24">
          <CardContent className="text-center space-y-4">
            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
              <FileText className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">No research available</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Select a company above and run the research to get a comprehensive analysis of their financials, credit ratings, legal history, and compliance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Research Results */}
      {research && research.overallRisk && research.overallRisk !== "PROCESSING" && research.overallRisk !== "ERROR" && (
        <Card className="card-premium mt-4">
          <CardHeader className="p-6 border-b bg-slate-50/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg font-semibold text-slate-900">
                 Research Report — {research.companyName}
              </CardTitle>
              <Badge className={cn("text-xs font-semibold px-3 py-1", 
                research.overallRisk.toUpperCase() === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                research.overallRisk.toUpperCase() === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              )}>
                {research.overallRisk} risk
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {research.rawResearch ? (
              <ScrollArea className="h-[600px] w-full p-6">
                <div className="max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-600">
                    {research.rawResearch}
                  </pre>
                </div>
              </ScrollArea>
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">
                Data Stream unavailable or malformed.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ResearchAgent;