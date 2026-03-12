import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Loader2, Building2, Landmark, UserPlus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { caseService, CreateCompanyData, CreateCaseData } from "@/services/caseService";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Corporate Entity", description: "Company registration & sector", icon: Building2 },
  { title: "Facility Details", description: "Loan amount & purpose", icon: Landmark },
  { title: "Key Management", description: "Promoter & governance", icon: UserPlus }
];

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
  
  const [form, setForm] = useState({
    companyName: "",
    cin: "",
    sector: "",
    industry: "",
    registeredAddress: "",
    loanAmount: "",
    loanPurpose: "",
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
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    const error = validateStep();
    if (error) {
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
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
      const caseData: CreateCaseData = {
        companyId: companyResponse.id,
        loanRequestAmount: Number(form.loanAmount),
        loanPurpose: form.loanPurpose,
        status: "Draft",
      };

      const caseResponse = await caseService.createCase(caseData);
      toast({ title: "Case Created", description: `Pipeline initialized for ${form.companyName}.` });
      navigate(`/cases/${caseResponse.case_id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create case.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Initialize Credit Pipeline</h2>
        <p className="text-slate-500">Provide baseline entity and facility data to start AI-augmented analysis.</p>
      </div>

      {/* Modern Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div 
            key={i} 
            className={cn(
              "p-4 rounded-xl border transition-all duration-300 flex items-center gap-4",
              i === step ? "bg-white border-primary shadow-premium ring-4 ring-primary/5" : 
              i < step ? "bg-slate-50 border-emerald-100" : "bg-white border-slate-100 opacity-60"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              i === step ? "gradient-primary text-white" : 
              i < step ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
            </div>
            <div className="flex flex-col">
              <span className={cn("text-sm font-bold", i === step ? "text-slate-900" : "text-slate-500")}>{s.title}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{s.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form */}
        <div className="lg:col-span-8">
          <div className="card-premium">
            <div className="p-6 border-b bg-slate-50/30">
              <h3 className="font-bold text-slate-900">{steps[step].title}</h3>
            </div>
            <CardContent className="p-8 space-y-6">
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Name</Label>
                    <Input 
                      placeholder="Enter legal entity name" 
                      className="input-premium h-12"
                      value={form.companyName} 
                      onChange={(e) => update("companyName", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Corporate Identification Number (CIN)</Label>
                    <Input 
                      placeholder="e.g. U12345MH2020PTC..." 
                      className="input-premium h-12 uppercase"
                      value={form.cin} 
                      onChange={(e) => update("cin", e.target.value.toUpperCase())}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sector</Label>
                      <Select 
                        value={form.sector} 
                        onValueChange={(v) => { update("sector", v); update("industry", ""); }}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12 input-premium"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {sectors.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Industry</Label>
                      <Select 
                        value={form.industry} 
                        onValueChange={(v) => update("industry", v)}
                        disabled={!form.sector || loading}
                      >
                        <SelectTrigger className="h-12 input-premium"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {sectors.find(s => s.name === form.sector)?.industries.map(i => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Office Address</Label>
                    <Textarea 
                      placeholder="Complete physical address" 
                      className="input-premium min-h-[100px] pt-3"
                      value={form.registeredAddress} 
                      onChange={(e) => update("registeredAddress", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Loan Request Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="input-premium h-14 pl-10 text-xl font-bold"
                        value={form.loanAmount} 
                        onChange={(e) => update("loanAmount", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">System will analyze facility against historical financial capacity.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Facility Purpose</Label>
                    <Textarea 
                      placeholder="Detailed explanation of fund utilization..." 
                      className="input-premium min-h-[160px] pt-3"
                      value={form.loanPurpose} 
                      onChange={(e) => update("loanPurpose", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Promoter Name</Label>
                      <Input 
                        placeholder="Full Name" 
                        className="input-premium h-12"
                        value={form.promoterName} 
                        onChange={(e) => update("promoterName", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Shareholding %</Label>
                      <Input 
                        type="number" 
                        placeholder="e.g. 51" 
                        className="input-premium h-12"
                        value={form.promoterShareholding} 
                        onChange={(e) => update("promoterShareholding", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Director Identification Number (DIN)</Label>
                    <Input 
                      placeholder="8-digit DIN" 
                      className="input-premium h-12"
                      value={form.promoterDIN} 
                      onChange={(e) => update("promoterDIN", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Internal Notes</Label>
                    <Textarea 
                      placeholder="Any specific observations for the risk team..." 
                      className="input-premium min-h-[100px] pt-3"
                      value={form.additionalNotes} 
                      onChange={(e) => update("additionalNotes", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6">
                <Button 
                  variant="ghost" 
                  className="font-bold text-slate-500 hover:text-slate-900"
                  onClick={() => step > 0 ? setStep(step - 1) : navigate("/dashboard")}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> 
                  {step > 0 ? "Previous" : "Exit Portal"}
                </Button>
                
                {step < steps.length - 1 ? (
                  <Button className="btn-primary min-w-[120px]" onClick={handleNext}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button className="btn-primary min-w-[160px]" onClick={handleSubmit} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Initialize Case
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <h4 className="font-bold">Next Steps</h4>
            </div>
            <ul className="space-y-4 text-xs font-medium text-slate-400">
              <li className="flex gap-3">
                <div className="h-5 w-5 rounded bg-white/5 flex items-center justify-center shrink-0">1</div>
                <span>Upload financial documents (GST, ITR, Audit Reports) for AI parsing.</span>
              </li>
              <li className="flex gap-3">
                <div className="h-5 w-5 rounded bg-white/5 flex items-center justify-center shrink-0">2</div>
                <span>AI Research agent performs deep-web due diligence on entity.</span>
              </li>
              <li className="flex gap-3">
                <div className="h-5 w-5 rounded bg-white/5 flex items-center justify-center shrink-0">3</div>
                <span>Automated CAM generation with risk analysis & scoring.</span>
              </li>
            </ul>
          </div>
          
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Compliance Note</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ensure all corporate identifiers match official registrar records to prevent pipeline stalls during automated verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCase;