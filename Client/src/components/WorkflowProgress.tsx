import { useEffect, useState } from "react";
import { CheckCircle, Loader2, Clock, XCircle } from "lucide-react";
import { caseService } from "@/services/caseService";
import { riskService } from "@/services/riskService";
import { recommendationService } from "@/services/recommendationService";
import { dueDiligenceService } from "@/services/dueDiligenceService";

interface WorkflowStep {
    label: string;
    subLabel: string;
    status: "done" | "active" | "pending" | "error";
}

interface WorkflowProgressProps {
    caseId: string;
    compact?: boolean;
}

const StepIcon = ({ status }: { status: WorkflowStep["status"] }) => {
    if (status === "done") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "active") return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-300" />;
};

export function WorkflowProgress({ caseId, compact = false }: WorkflowProgressProps) {
    const [steps, setSteps] = useState<WorkflowStep[]>([
        { label: "Documents", subLabel: "Repository", status: "pending" },
        { label: "Research", subLabel: "AI Analysis", status: "pending" },
        { label: "Due Diligence", subLabel: "Site Visit", status: "pending" },
        { label: "Risk", subLabel: "Scorecard", status: "pending" },
        { label: "Recommendation", subLabel: "Decision", status: "pending" },
        { label: "CAM", subLabel: "Final Memo", status: "pending" },
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (caseId) {
            checkStatus();
        }
    }, [caseId]);

    const checkStatus = async () => {
        try {
            setLoading(true);
            const newSteps: WorkflowStep[] = [
                { label: "Documents", subLabel: "Repository", status: "pending" },
                { label: "Research", subLabel: "AI Analysis", status: "pending" },
                { label: "Due Diligence", subLabel: "Site Visit", status: "pending" },
                { label: "Risk", subLabel: "Scorecard", status: "pending" },
                { label: "Recommendation", subLabel: "Decision", status: "pending" },
                { label: "CAM", subLabel: "Final Memo", status: "pending" },
            ];

            // 1. Documents
            try {
                const docs = await import("@/services/documentService").then(m => m.documentService.getDocumentsByCase(caseId));
                if (docs && docs.length > 0) {
                    newSteps[0].status = "done";
                    newSteps[0].subLabel = `${docs.length} Doc(s)`;
                } else {
                    newSteps[0].status = "active";
                    newSteps[0].subLabel = "Awaiting Upload";
                }
            } catch {
                newSteps[0].status = "active";
                newSteps[0].subLabel = "Check Docs";
            }

            // 2. Research
            try {
                const research = await caseService.getResearchStatus(caseId);
                if (research.exists && research.status === "COMPLETED") {
                    newSteps[1].status = "done";
                    newSteps[1].subLabel = "Completed";
                } else if (research.exists && research.status === "PROCESSING") {
                    newSteps[1].status = "active";
                    newSteps[1].subLabel = "AI Running...";
                } else if (newSteps[0].status === "done") {
                    newSteps[1].status = "pending";
                    newSteps[1].subLabel = "Ready to start";
                } else {
                    newSteps[1].status = "pending";
                    newSteps[1].subLabel = "Needs Documents";
                }
            } catch { }

            // 3. Due Diligence
            try {
                const dd = await dueDiligenceService.getDueDiligenceByCase(caseId);
                if (dd) {
                    newSteps[2].status = "done";
                    newSteps[2].subLabel = `${dd.managementCredibility}`;
                } else if (newSteps[1].status === "done") {
                    newSteps[2].status = "active";
                    newSteps[2].subLabel = "Awaiting Visit";
                } else {
                    newSteps[2].status = "pending";
                    newSteps[2].subLabel = "Needs Research";
                }
            } catch { }

            // 4. Risk
            try {
                const risk = await riskService.getLatestRiskByCase(caseId);
                if (risk && risk.status === "COMPLETED") {
                    newSteps[3].status = "done";
                    newSteps[3].subLabel = `Score: ${risk.overallScore?.toFixed(0) ?? "?"}`;
                } else if (risk && risk.status === "PROCESSING") {
                    newSteps[3].status = "active";
                    newSteps[3].subLabel = "Analyzing...";
                } else if (risk && risk.status === "ERROR") {
                    newSteps[3].status = "error";
                    newSteps[3].subLabel = "System Error";
                } else if (newSteps[2].status === "done" && newSteps[1].status === "done") {
                    newSteps[3].status = "pending";
                    newSteps[3].subLabel = "Ready to score";
                } else {
                    newSteps[3].status = "pending";
                    newSteps[3].subLabel = "Prerequisites";
                }
            } catch { }

            // 5. Recommendation
            try {
                const finStatus = await recommendationService.getFinalizeStatus(caseId);
                if (finStatus.finalized) {
                    newSteps[4].status = "done";
                    newSteps[4].subLabel = finStatus.finalStatus || "Finalized";
                } else if (finStatus.hasRecommendation) {
                    newSteps[4].status = "active";
                    newSteps[4].subLabel = "Reviewing...";
                } else if (newSteps[3].status === "done") {
                    newSteps[4].status = "pending";
                    newSteps[4].subLabel = "Awaiting Rec";
                } else {
                    newSteps[4].status = "pending";
                    newSteps[4].subLabel = "Needs Score";
                }
            } catch { }

            // 6. CAM
            try {
                const camReports = await caseService.getCAMReports(caseId);
                if (camReports && camReports.length > 0) {
                    newSteps[5].status = "done";
                    newSteps[5].subLabel = `${camReports.length} Memo(s)`;
                } else if (newSteps[4].status === "done") {
                    newSteps[5].status = "active";
                    newSteps[5].subLabel = "Drafting...";
                } else {
                    newSteps[5].status = "pending";
                    newSteps[5].subLabel = "Needs Decision";
                }
            } catch { }

            setSteps(newSteps);
        } catch (err) {
            console.error("WorkflowProgress error:", err);
        } finally {
            setLoading(false);
        }
    };

    const completedCount = steps.filter(s => s.status === "done").length;
    const pct = Math.round((completedCount / steps.length) * 100);

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                {steps.map((step, i) => (
                    <div
                        key={i}
                        title={`${step.label}: ${step.status}`}
                        className={`h-2 flex-1 rounded-full transition-colors ${step.status === "done" ? "bg-green-500" :
                            step.status === "active" ? "bg-blue-400 animate-pulse" :
                                step.status === "error" ? "bg-red-400" : "bg-slate-200"
                            }`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 rounded-2xl bg-white/50 backdrop-blur-md border border-white/20 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Credit Pipeline Velocity</h3>
                    <p className="text-[10px] text-slate-500">Automated workflow tracking</p>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-indigo-600 font-mono">{pct}%</span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{completedCount}/{steps.length} steps</p>
                </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>

            <div className="grid grid-cols-6 gap-2">
                {steps.map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 group">
                        <div className={`p-1.5 rounded-xl transition-all duration-300 ${step.status === "done" ? "bg-green-50 text-green-600" :
                            step.status === "active" ? "bg-blue-50 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                                step.status === "error" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-300"
                            }`}>
                            <StepIcon status={step.status} />
                        </div>
                        <div className="text-center overflow-hidden w-full">
                            <p className={`text-[9px] font-bold truncate uppercase tracking-tighter ${step.status === "done" || step.status === "active" ? "text-slate-900" : "text-slate-400"
                                }`}>{step.label}</p>
                            <p className="text-[8px] text-slate-400 truncate font-mono">{step.subLabel}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WorkflowProgress;
