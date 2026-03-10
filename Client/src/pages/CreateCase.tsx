import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { caseService, CreateCompanyData, CreateCaseData } from "@/services/caseService";

const steps = ["Company Details", "Loan Details", "Promoter Info"];

// Industry sectors with subsectors
const sectors = [
  { name: "Manufacturing", industries: ["Steel", "Automotive", "Textile", "Chemicals", "Electronics"] },
  { name: "IT Services", industries: ["Software Development", "Consulting", "BPO", "Cloud Services"] },
  { name: "Logistics", industries: ["Transportation", "Warehousing", "Supply Chain"] },
  { name: "Agriculture", industries: ["Farming", "Agri-Processing", "Dairy", "Poultry"] },
  { name: "Pharmaceuticals", industries: ["Drug Manufacturing", "Research", "Distribution"] },
  { name: "Real Estate", industries: ["Residential", "Commercial", "Construction"] },
  { name: "Retail", industries: ["E-commerce", "Brick & Mortar", "Supermarkets"] },
  { name: "FMCG", industries: ["Food & Beverage", "Personal Care", "Household Products"] },
];

const CreateCase = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [form, setForm] = useState({
    // Company Details
    companyName: "",
    cin: "",
    sector: "",
    industry: "",
    registeredAddress: "",
    
    // Loan Details
    loanAmount: "",
    loanPurpose: "",
    
    // Promoter Info
    promoterName: "",
    promoterShareholding: "",
    promoterDIN: "",
    additionalNotes: "",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const validateStep = () => {
    switch(step) {
      case 0:
        if (!form.companyName) return "Company name is required";
        if (!form.cin) return "CIN is required";
        if (!form.sector) return "Sector is required";
        if (!form.industry) return "Industry is required";
        if (!form.registeredAddress) return "Registered address is required";
        break;
      case 1:
        if (!form.loanAmount || Number(form.loanAmount) <= 0) return "Valid loan amount is required";
        if (!form.loanPurpose) return "Loan purpose is required";
        break;
      case 2:
        if (!form.promoterName) return "Promoter name is required";
        if (!form.promoterShareholding || Number(form.promoterShareholding) <= 0 || Number(form.promoterShareholding) > 100) 
          return "Valid shareholding percentage (1-100) is required";
        break;
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    const error = validateStep();
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Create Company
      const companyData: CreateCompanyData = {
        companyName: form.companyName,
        CIN: form.cin,
        sector: form.sector,
        industry: form.industry,
        registeredAddress: form.registeredAddress,
        promoters: [{
          name: form.promoterName,
          shareholding: Number(form.promoterShareholding),
          DIN: form.promoterDIN || undefined,
        }]
      };

      const companyResponse = await caseService.createCompany(companyData);
      
      // Step 2: Create Credit Case
      const caseData: CreateCaseData = {
        companyId: companyResponse.id,
        loanRequestAmount: Number(form.loanAmount),
        loanPurpose: form.loanPurpose,
        status: "draft",
      };

      const caseResponse = await caseService.createCase(caseData);

      toast({
        title: "Success!",
        description: `Credit case for ${form.companyName} has been created successfully.`,
      });

      // Navigate to the documents upload page for this case
      navigate(`/documents?caseId=${caseResponse.case_id}`);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create case. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium 
              ${i <= step ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i <= step ? "font-medium" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 ${i < step ? "gradient-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
          <CardDescription>Step {step + 1} of {steps.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Company Details */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="companyName"
                  placeholder="e.g. ABC Steel Pvt Ltd" 
                  value={form.companyName} 
                  onChange={(e) => update("companyName", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cin">CIN (Corporate Identification Number) <span className="text-destructive">*</span></Label>
                <Input 
                  id="cin"
                  placeholder="e.g. U12345MH2020PTC123456" 
                  value={form.cin} 
                  onChange={(e) => update("cin", e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector <span className="text-destructive">*</span></Label>
                  <Select 
                    value={form.sector} 
                    onValueChange={(v) => {
                      update("sector", v);
                      update("industry", ""); // Reset industry when sector changes
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>
                      {sectors.map(s => (
                        <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry <span className="text-destructive">*</span></Label>
                  <Select 
                    value={form.industry} 
                    onValueChange={(v) => update("industry", v)}
                    disabled={!form.sector || loading}
                  >
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {sectors.find(s => s.name === form.sector)?.industries.map(i => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Registered Address <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="address"
                  placeholder="Enter complete registered address" 
                  value={form.registeredAddress} 
                  onChange={(e) => update("registeredAddress", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </>
          )}

          {/* Step 1: Loan Details */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="loanAmount">Loan Amount (₹) <span className="text-destructive">*</span></Label>
                <Input 
                  id="loanAmount"
                  type="number" 
                  min="1"
                  step="1000"
                  placeholder="e.g. 100000000" 
                  value={form.loanAmount} 
                  onChange={(e) => update("loanAmount", e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter amount in Indian Rupees (e.g., 10000000 for 1 Crore)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanPurpose">Loan Purpose <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="loanPurpose"
                  placeholder="Describe the purpose of the loan (e.g., Working capital, Equipment purchase, Expansion)" 
                  value={form.loanPurpose} 
                  onChange={(e) => update("loanPurpose", e.target.value)}
                  disabled={loading}
                  rows={4}
                  required
                />
              </div>
            </>
          )}

          {/* Step 2: Promoter Info */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="promoterName">Promoter Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="promoterName"
                  placeholder="Full name of primary promoter" 
                  value={form.promoterName} 
                  onChange={(e) => update("promoterName", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shareholding">Shareholding Percentage <span className="text-destructive">*</span></Label>
                <Input 
                  id="shareholding"
                  type="number" 
                  min="1"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 51" 
                  value={form.promoterShareholding} 
                  onChange={(e) => update("promoterShareholding", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="din">DIN (Director Identification Number) <span className="text-muted-foreground">(Optional)</span></Label>
                <Input 
                  id="din"
                  placeholder="e.g. 01234567" 
                  value={form.promoterDIN} 
                  onChange={(e) => update("promoterDIN", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes <span className="text-muted-foreground">(Optional)</span></Label>
                <Textarea 
                  id="notes"
                  placeholder="Any additional information about the promoter or company" 
                  value={form.additionalNotes} 
                  onChange={(e) => update("additionalNotes", e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => step > 0 ? setStep(step - 1) : navigate("/dashboard")}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              {step > 0 ? "Back" : "Cancel"}
            </Button>
            
            {step < steps.length - 1 ? (
              <Button 
                className="gradient-primary border-0"
                onClick={handleNext}
                disabled={loading}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                className="gradient-primary border-0"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Case <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCase;