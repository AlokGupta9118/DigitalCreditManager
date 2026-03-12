import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    FileText,
    Search,
    AlertTriangle,
    CheckCircle2,
    FileCheck,
    PlusCircle,
    Activity,
    ClipboardCheck,
    History,
    Cpu,
    User,
    ChevronRight
} from 'lucide-react';
import { ActivityLog } from '../services/activityService';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityFeedProps {
    logs: ActivityLog[];
    loading?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs, loading }) => {
    const getIcon = (category: string) => {
        const iconClass = "h-4 w-4";
        switch (category) {
            case 'CASE': return <PlusCircle className={`${iconClass} text-indigo-500`} />;
            case 'DOCUMENT': return <FileText className={`${iconClass} text-orange-500`} />;
            case 'RESEARCH': return <Search className={`${iconClass} text-purple-500`} />;
            case 'DUE_DILIGENCE': return <ClipboardCheck className={`${iconClass} text-blue-500`} />;
            case 'RISK': return <AlertTriangle className={`${iconClass} text-rose-500`} />;
            case 'RECOMMENDATION': return <FileCheck className={`${iconClass} text-emerald-500`} />;
            case 'CAM': return <CheckCircle2 className={`${iconClass} text-teal-500`} />;
            default: return <Activity className={`${iconClass} text-slate-500`} />;
        }
    };

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'CASE': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'DOCUMENT': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'RESEARCH': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'DUE_DILIGENCE': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'RISK': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'RECOMMENDATION': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'CAM': return 'bg-teal-50 text-teal-700 border-teal-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-3 pt-1">
                            <div className="h-4 bg-slate-100 rounded w-2/3" />
                            <div className="flex gap-2">
                                <div className="h-3 bg-slate-100 rounded w-16" />
                                <div className="h-3 bg-slate-100 rounded w-24" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <History className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">No activity recorded yet</p>
                <p className="text-xs">System actions will appear here in real-time</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-0 pb-4">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-100 to-transparent" />

            <AnimatePresence mode="popLayout">
                {logs.map((log, index) => (
                    <motion.div 
                        key={log._id || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex gap-5 relative pb-8 last:pb-2"
                    >
                        <div className="relative z-10 shrink-0">
                            <div className={`h-10 w-10 rounded-xl border border-white shadow-sm flex items-center justify-center bg-white group-hover:scale-110 transition-transform duration-300 ${
                                index === 0 ? "ring-4 ring-indigo-50" : ""
                            }`}>
                                {getIcon(log.category)}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                                        {log.action}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border border-transparent font-black uppercase tracking-widest ${getCategoryStyles(log.category)}`}>
                                            {log.category.replace('_', ' ')}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                            <Cpu className="h-3 w-3" />
                                            <span>{log.user || 'AI Agent'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg">
                                        {formatDistanceToNow(log.timestamp ? new Date(log.timestamp) : new Date(), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                            
                            {log.details && Object.keys(log.details).length > 0 && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    whileHover={{ height: 'auto', opacity: 1 }}
                                    className="mt-3 overflow-hidden"
                                >
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                                        {Object.entries(log.details).map(([key, val]) => (
                                            <div key={key} className="flex justify-between">
                                                <span className="font-bold text-slate-400 uppercase tracking-tighter">{key}:</span>
                                                <span className="font-mono">{String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ActivityFeed;
