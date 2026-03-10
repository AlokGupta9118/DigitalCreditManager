import { useEffect, useState } from "react";
import { CheckCircle, Loader2, Clock, XCircle } from "lucide-react";
import { caseService } from "@/services/caseService";
import { riskService } from "@/services/riskService";
import { recommendationService } from "@/services/recommendationService";

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
        { label: "Documents", subLabel: "Upload", status: "pending" },
        { label: "Research", subLabel: "AI Analysis", status: "pending" },
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
                { label: "Documents", subLabel: "Upload", status: "pending" },
                { label: "Research", subLabel: "AI Analysis", status: "pending" },
                { label: "Risk", subLabel: "Scorecard", status: "pending" },
                { label: "Recommendation", subLabel: "Decision", status: "pending" },
                { label: "CAM", subLabel: "Final Memo", status: "pending" },
            ];

            // Step 1: Documents
            try {
                const docs = await import("@/services/documentService").then(m => m.documentService.getDocumentsByCase(caseId));
                if (docs && docs.length > 0) {
                    newSteps[0].status = "done";
                    newSteps[0].subLabel = `${docs.length} doc(s)`;
                } else {
                    newSteps[0].status = "active";
                }
            } catch {
                newSteps[0].status = "active";
            }

            // Step 2: Research
            try {
                const research = await caseService.getResearchStatus(caseId);
                if (research.exists && research.status === "COMPLETED") {
                    newSteps[1].status = "done";
                } else if (research.exists) {
                    newSteps[1].status = "active";
                }
            } catch {
                // pending
            }

            if (newSteps[1].status !== "done") {
                setSteps([...newSteps]);
                setLoading(false);
                return;
            }

            // Step 3: Risk
            try {
                const risk = await riskService.getLatestRiskByCase(caseId);
                if (risk.status === "COMPLETED") {
                    newSteps[2].status = "done";
                    newSteps[2].subLabel = `Score: ${risk.overallScore?.toFixed(0) ?? "?"}`;
                } else if (risk.status === "PROCESSING") {
                    newSteps[2].status = "active";
                } else if (risk.status === "ERROR") {
                    newSteps[2].status = "error";
                }
            } catch {
                // pending
            }

            if (newSteps[2].status !== "done") {
                setSteps([...newSteps]);
                setLoading(false);
                return;
            }

            // Step 4: Recommendation
            try {
                const finStatus = await recommendationService.getFinalizeStatus(caseId);
                if (finStatus.finalized) {
                    newSteps[3].status = "done";
                    newSteps[3].subLabel = finStatus.finalStatus || "Finalized";
                } else if (finStatus.hasRecommendation) {
                    newSteps[3].status = "active";
                    newSteps[3].subLabel = "Awaiting Officer";
                }
            } catch {
                // pending
            }

            if (newSteps[3].status !== "done") {
                setSteps([...newSteps]);
                setLoading(false);
                return;
            }

            // Step 5: CAM
            try {
                const camReports = await import("@/services/caseService").then(m => m.caseService.getCAMReports(caseId));
                if (camReports && camReports.length > 0) {
                    newSteps[4].status = "done";
                    newSteps[4].subLabel = `${camReports.length} report(s)`;
                }
            } catch {
                // pending
            }

            setSteps(newSteps);
        } catch (err) {
            console.error("WorkflowProgress error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading pipeline status...
            </div>
        );
    }

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
                                    step.status === "error" ? "bg-red-400" :
                                        "bg-gray-200"
                            }`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Workflow Progress</span>
                <span>{completedCount}/{steps.length} steps complete ({pct}%)</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                    className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Steps */}
            <div className="flex items-start gap-0">
                {steps.map((step, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        {/* Connector line + icon */}
                        <div className="flex items-center w-full">
                            {i > 0 && (
                                <div className={`flex-1 h-0.5 ${steps[i - 1].status === "done" ? "bg-green-500" : "bg-gray-200"}`} />
                            )}
                            <div className={`rounded-full p-1 flex-shrink-0 ${step.status === "done" ? "bg-green-50" :
                                    step.status === "active" ? "bg-blue-50" :
                                        step.status === "error" ? "bg-red-50" :
                                            "bg-gray-50"
                                }`}>
                                <StepIcon status={step.status} />
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 ${step.status === "done" ? "bg-green-500" : "bg-gray-200"}`} />
                            )}
                        </div>
                        {/* Label */}
                        <div className="text-center">
                            <p className={`text-[10px] font-medium ${step.status === "done" ? "text-green-700" :
                                    step.status === "active" ? "text-blue-700" :
                                        step.status === "error" ? "text-red-700" :
                                            "text-gray-400"
                                }`}>{step.label}</p>
                            <p className="text-[9px] text-gray-400">{step.subLabel}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WorkflowProgress;
