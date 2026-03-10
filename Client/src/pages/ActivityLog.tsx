import React, { useState, useEffect } from 'react';
import { activityService, ActivityLog } from '../services/activityService';
import ActivityFeed from '../components/ActivityFeed';
import { Activity, Filter, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let data;
      if (filter === 'ALL') {
        data = await activityService.getGlobalLogs(50);
      } else {
        data = await activityService.getCategoryLogs(filter, 50);
      }
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            System Activity Log
          </h1>
          <p className="text-slate-500">Track all actions, AI executions, and status changes across the system</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            {['ALL', 'CASE', 'DOCUMENT', 'RESEARCH', 'RISK', 'RECOMMENDATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="p-8">
          <ActivityFeed logs={logs} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
