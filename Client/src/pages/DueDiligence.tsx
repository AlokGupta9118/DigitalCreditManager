import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, Save, Camera, Building2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { companyService, Company } from "@/services/companyService";
import { caseService } from "@/services/caseService";
import { CreditCase } from "@/types/creditCase";
import { dueDiligenceService } from "@/services/dueDiligenceService";

// Better to define API_URL here or import it if exported
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DueDiligence = () => {
  const { state, setSelectedCompanyId, setSelectedCaseId } = useWorkflow();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cases, setCases] = useState<CreditCase[]>([]);
  
  const [capacity, setCapacity] = useState([40]);
  const [credibility, setCredibility] = useState<"Excellent" | "Good" | "Average" | "Poor">("Average");
  const [factoryNotes, setFactoryNotes] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedCompanyId = state.selectedCompanyId || "";
  const selectedCaseId = state.selectedCaseId || "";

  // Load companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load cases when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchCases(selectedCompanyId);
    } else {
      setCases([]);
    }
  }, [selectedCompanyId]);

  // Load existing data when case changes
  useEffect(() => {
    if (selectedCaseId) {
      loadDueDiligence(selectedCaseId);
    } else {
      resetForm();
    }
  }, [selectedCaseId]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies");
    }
  };

  const fetchCases = async (companyId: string) => {
    try {
      const data = await caseService.getCasesByCompany(companyId);
      setCases(data);
    } catch (err) {
      console.error("Failed to fetch cases");
    }
  };

  const loadDueDiligence = async (caseId: string) => {
    try {
      setLoading(true);
      const data = await dueDiligenceService.getDueDiligenceByCase(caseId);
      if (data) {
        setCapacity([data.factoryCapacityUtilization]);
        setCredibility(data.managementCredibility);
        setFactoryNotes(data.visitNotes);
        setRiskNotes(data.operationalRisks);
        setSitePhotos(data.sitePhotos || []);
      } else {
        resetForm();
      }
    } catch (err) {
      console.error("Failed to load DD data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCapacity([40]);
    setCredibility("Average");
    setFactoryNotes("");
    setRiskNotes("");
    setSitePhotos([]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    const files = Array.from(e.target.files);
    const newPhotos: string[] = [];
    
    try {
      for (const file of files) {
        const url = await dueDiligenceService.uploadPhoto(file);
        newPhotos.push(url);
      }
      setSitePhotos(prev => [...prev, ...newPhotos]);
      toast({
        title: "Photos Uploaded",
        description: `Successfully uploaded ${newPhotos.length} photos.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not upload some photos.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setSitePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedCaseId) {
      toast({
        title: "No Case Selected",
        description: "Please select a credit case first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await dueDiligenceService.saveDueDiligence({
        creditCaseId: selectedCaseId,
        factoryCapacityUtilization: capacity[0],
        managementCredibility: credibility,
        operationalRisks: riskNotes,
        visitNotes: factoryNotes,
        sitePhotos: sitePhotos,
      });
      toast({
        title: "Success",
        description: "Due diligence observations recorded successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save observations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Credit Case Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c._id} value={c._id || ""}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Credit Case</Label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId} disabled={!selectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.borrowerName} ({c.loanPurpose})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="shadow-card">
            <CardHeader><CardTitle>Factory Visit Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Observations</Label>
                <Textarea 
                  placeholder="Describe factory conditions, equipment state, workforce observations..." 
                  className="min-h-[120px]" 
                  value={factoryNotes} 
                  onChange={(e) => setFactoryNotes(e.target.value)} 
                />
              </div>
              <div className="space-y-3">
                <Label>Factory Operating Capacity: {capacity[0]}%</Label>
                <Slider value={capacity} onValueChange={setCapacity} max={100} step={5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Management Credibility</Label>
                <Select value={credibility} onValueChange={(v: any) => setCredibility(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Excellent", "Good", "Average", "Poor"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle>Operational Risk Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Note any operational risks: labour issues, supply chain disruptions, environmental concerns..." 
                className="min-h-[100px]" 
                value={riskNotes} 
                onChange={(e) => setRiskNotes(e.target.value)} 
              />
            </CardContent>
          </Card>

          <Card className="shadow-card overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-md flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Site Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {sitePhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                  {sitePhotos.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden border bg-slate-50">
                      <img 
                        src={url.startsWith('http') ? url : `${API_URL}${url}`} 
                        alt={`Site ${idx}`} 
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <button 
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                <input 
                  type="file" 
                  id="site-photo-upload" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {uploading ? "Uploading files..." : "Upload factory/site inspection photos"}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('site-photo-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Processing..." : "Select Photos"}
                </Button>
                <p className="text-[10px] text-slate-500 mt-4">JPG, PNG supported. Multiple files allowed.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              className="gradient-primary border-0 min-w-[140px]" 
              onClick={handleSave}
              disabled={saving || !selectedCaseId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Save Notes
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DueDiligence;
