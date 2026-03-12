import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Camera, Loader2, Warehouse, UserCheck, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface DueDiligenceTabProps {
  caseId: string;
}

const DueDiligenceTab = ({ caseId }: DueDiligenceTabProps) => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [capacity, setCapacity] = useState([40]);
  const [credibility, setCredibility] = useState<"Excellent" | "Good" | "Average" | "Poor">("Average");
  const [factoryNotes, setFactoryNotes] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setAnalyzing(true);
      toast({
        title: "AI Analysis Started",
        description: "Extracting insights from uploaded site visit data...",
      });
      try {
        const data = await dueDiligenceService.analyzeDueDiligence(factoryNotes, selectedFile);
        if (data) {
          setCapacity([data.factoryCapacityUtilization]);
          setCredibility(data.managementCredibility);
          if (data.operationalRisks) setRiskNotes(data.operationalRisks);
          if (data.visitNotes) setFactoryNotes(data.visitNotes);
          toast({
            title: "Analysis Complete",
            description: "Fields auto-populated by AI.",
          });
        }
      } catch (err: any) {
        toast({
          title: "Analysis Failed",
          description: err.message || "Failed to analyze file",
          variant: "destructive",
        });
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files);
      const urls: string[] = [];
      for (const f of files) {
        const url = await dueDiligenceService.uploadPhoto(f);
        urls.push(url);
      }
      setSitePhotos(prev => [...prev, ...urls]);
      toast({ title: "Photos Uploaded", description: `Added ${urls.length} photos to gallery.` });
    } catch (err) {
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (caseId) {
      loadDueDiligence();
    }
  }, [caseId]);

  const loadDueDiligence = async () => {
    try {
      setLoading(true);
      const data = await dueDiligenceService.getDueDiligenceByCase(caseId);
      if (data) {
        setCapacity([data.factoryCapacityUtilization]);
        setCredibility(data.managementCredibility);
        setFactoryNotes(data.visitNotes);
        setRiskNotes(data.operationalRisks);
        setSitePhotos(data.sitePhotos || []);
      }
    } catch (err) {
      console.error("Failed to load DD data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await dueDiligenceService.saveDueDiligence({
        creditCaseId: caseId,
        factoryCapacityUtilization: capacity[0],
        managementCredibility: credibility,
        operationalRisks: riskNotes,
        visitNotes: factoryNotes,
        sitePhotos: sitePhotos,
      });
      toast({
        title: "Diligence Recorded",
        description: "Site visit observations have been synced to the credit engine.",
      });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to save observations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 animate-pulse">Retrieving site visit records...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-md flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-indigo-600" />
                Factory Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Site Status & Notes</Label>
                <Textarea 
                  placeholder="Describe factory conditions, workforce activity, inventory levels..." 
                  className="min-h-[120px] bg-white/80 border-slate-200 focus:ring-indigo-500 transition-all" 
                  value={factoryNotes} 
                  onChange={(e) => setFactoryNotes(e.target.value)} 
                />
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Capacity Utilization</Label>
                  <span className="text-lg font-bold text-indigo-600">{capacity[0]}%</span>
                </div>
                <Slider 
                  value={capacity} 
                  onValueChange={setCapacity} 
                  max={100} 
                  step={5} 
                  className="py-4"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>IDLE</span><span>ACTIVE</span><span>MAX</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-md flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                Management Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Interaction Rating</Label>
                <Select value={credibility} onValueChange={(v: any) => setCredibility(v)}>
                  <SelectTrigger className="bg-white/80 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Excellent", "Good", "Average", "Poor"].map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  Critical for "Promoter Background" and "Governance" scoring categories.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden h-fit">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-md flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Operational Risk Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Risk Observations</Label>
                <Textarea 
                  placeholder="Note any labour issues, supply chain disruptions, environmental hazards seen during visit..." 
                  className="min-h-[160px] bg-white/80 border-slate-200 focus:ring-indigo-500 transition-all" 
                  value={riskNotes} 
                  onChange={(e) => setRiskNotes(e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-widest">Site Verification (AI Analyze)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input 
                type="file" 
                id="dd-file-upload" 
                className="hidden" 
                accept="image/*,.pdf,.txt,.docx" 
                onChange={(e) => {
                  handleFileUpload(e);
                  // Reset input so the same file could be selected again if needed
                  e.target.value = '';
                }} 
                disabled={analyzing} 
              />
              <div 
                className={`p-6 border-2 border-dashed border-slate-700 rounded-2xl text-center transition-colors cursor-pointer group ${analyzing ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-800/50'}`}
                onClick={() => document.getElementById('dd-file-upload')?.click()}
              >
                {analyzing ? (
                  <Loader2 className="h-8 w-8 mx-auto text-indigo-400 mb-2 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 mx-auto text-slate-500 mb-2 group-hover:text-indigo-400 transition-colors" />
                )}
                <p className="text-xs font-medium mb-1">{file ? file.name : "Upload Inspection File"}</p>
                <p className="text-[10px] text-slate-500">{analyzing ? "Extracting Data Using AI..." : "Extract insights automatically"}</p>
              </div>

              <div className="pt-4 space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Site Photo Gallery</Label>
                
                {sitePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pb-4">
                    {sitePhotos.map((url, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                        <img 
                          src={url.startsWith('http') ? url : `${API_URL}${url}`} 
                          alt="observation" 
                          className="h-full w-full object-cover" 
                        />
                        <button 
                          onClick={() => setSitePhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input 
                  type="file" 
                  id="tab-photo-upload" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
                
                <Button 
                  variant="outline"
                  className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 h-10"
                  onClick={() => document.getElementById('tab-photo-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="mr-2 h-4 w-4" />}
                  {uploading ? "Uploading..." : "Add Site Photos"}
                </Button>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-none py-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-bold group" 
                  onClick={handleSave}
                  disabled={saving || analyzing || uploading}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />}
                  Record Site Observations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default DueDiligenceTab;
