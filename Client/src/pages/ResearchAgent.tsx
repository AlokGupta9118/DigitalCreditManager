import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
    <div className="space-y-6">
      {/* Header with company selector */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Credit Research
              </h2>
              
              <div className="flex gap-2">
                {research && (
                  <Button variant="outline" onClick={loadLatestResearch}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Company Selector */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Select Company to Research
                </label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={handleCompanyChange}
                  disabled={running || loadingCompanies}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCompanies ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : companies.length > 0 ? (
                      companies.map((company) => (
                        <SelectItem key={company._id} value={company._id || ""}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{company.companyName}</span>
                            {company.sector && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {company.sector}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No companies found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runResearch} 
                disabled={running || !selectedCompanyId}
                className="min-w-[150px]"
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
            </div>

            {selectedCompany && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">
                  <Building className="h-3 w-3 mr-1" />
                  {selectedCompany.companyName}
                </Badge>
                {selectedCompany.sector && (
                  <Badge variant="outline">
                    Sector: {selectedCompany.sector}
                  </Badge>
                )}
                {selectedCompany.promoterNames && selectedCompany.promoterNames.length > 0 && (
                  <Badge variant="outline">
                    Promoters: {selectedCompany.promoterNames.join(", ")}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {running && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Research in progress...</span>
              </div>
              <Progress value={45} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                This may take 1-2 minutes. The agent is searching MCA filings, credit ratings, court records, and financial data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Research State */}
      {!research && !running && (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Research Available</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Select a company and run credit research to get comprehensive analysis including company profile, financials, credit ratings, litigation, and regulatory compliance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Research Results */}
      {research && research.overallRisk && research.overallRisk !== "PROCESSING" && research.overallRisk !== "ERROR" && (
        <Card className="shadow-card mt-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Comprehensive Research Report: {research.companyName}</CardTitle>
              <Badge variant="outline" className={`text-sm px-3 py-1 ${getRiskColor(research.overallRisk || '')}`}>
                Risk Level: {research.overallRisk || 'UNKNOWN'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {research.rawResearch ? (
              <ScrollArea className="h-[600px] w-full rounded-md border p-4 bg-muted/10">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {research.rawResearch}
                </pre>
              </ScrollArea>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No research data available for this case. Try re-running the research.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResearchAgent;