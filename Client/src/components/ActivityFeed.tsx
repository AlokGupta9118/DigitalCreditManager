import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    FileText,
    Search,
    AlertTriangle,
    CheckCircle2,
    FileCheck,
    PlusCircle,
    Activity
} from 'lucide-react';
import { ActivityLog } from '../services/activityService';

interface ActivityFeedProps {
    logs: ActivityLog[];
    loading?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs, loading }) => {
    const getIcon = (category: string) => {
        switch (category) {
            case 'CASE': return <PlusCircle className="h-4 w-4 text-blue-500" />;
            case 'DOCUMENT': return <FileText className="h-4 w-4 text-orange-500" />;
            case 'RESEARCH': return <Search className="h-4 w-4 text-purple-500" />;
            case 'RISK': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'RECOMMENDATION': return <FileCheck className="h-4 w-4 text-green-500" />;
            case 'CAM': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            default: return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 rounded w-1/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No recent activity logs found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {logs.map((log, index) => (
                <div key={log._id || index} className="flex gap-4 relative">
                    {index !== logs.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-200" />
                    )}
                    <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0 z-10">
                        {getIcon(log.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                            {log.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                                {log.category}
                            </span>
                            <span className="text-xs text-slate-400">
                                {formatDistanceToNow(log.timestamp ? new Date(log.timestamp) : new Date(), { addSuffix: true })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActivityFeed;
