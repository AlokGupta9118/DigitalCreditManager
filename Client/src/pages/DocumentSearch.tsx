import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Building2, Calendar, HardDrive, Loader2, ArrowUpRight } from "lucide-react";
import { documentService, Document } from "@/services/documentService";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const DocumentSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsSearching(true);
        try {
          const data = await documentService.searchDocuments(query);
          setResults(data);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Extracted": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Processing": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Error": return "bg-rose-50 text-rose-700 border-rose-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      <div className="space-y-1 pt-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Document Search</h2>
        <p className="text-sm text-slate-500">
          Search across companies, cases, and document types.
        </p>
      </div>

      <div className="relative max-w-2xl">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
          </div>
          <Input 
            placeholder='Search by company, document type, or year...' 
            className="pl-11 h-11 text-sm rounded-lg border-slate-200 shadow-sm focus:shadow-md focus:ring-0 focus:border-primary/40 transition-all bg-white" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((doc) => (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            key={doc._id} 
            className="group card-premium p-5 flex flex-col gap-4 cursor-pointer hover:border-primary/30 relative">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight className="h-5 w-5 text-primary" />
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-slate-100">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge className={cn("px-2 py-0.5 border text-[10px] font-semibold mb-1.5", getStatusColor(doc.status))}>
                  {doc.status}
                </Badge>
                <h3 className="font-semibold text-sm text-slate-900 truncate leading-tight group-hover:text-primary transition-colors">
                  {doc.fileName}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 truncate">{(doc as any).companyName || "Unknown Company"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Financial year</span>
                  <span className="text-xs font-medium text-slate-600">{doc.financialYear}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-400 font-medium">Size</span>
                  <span className="text-xs font-medium text-slate-600">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-300" />
                <span className="text-[10px] text-slate-400 font-medium">
                   {formatDistanceToNow(new Date(doc.uploadDate))} ago
                </span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      {query.length > 0 && results.length === 0 && !isSearching && (
        <div className="text-center py-20 animate-in">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-medium text-slate-900">No matches found</h3>
          <p className="text-slate-500 mt-1">Try searching for a company name, document type or year</p>
        </div>
      )}

      {query.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10">
          {[
            { label: "Recent Uploads", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Pending Processing", icon: Loader2, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "Extraction Stats", icon: HardDrive, color: "text-purple-500", bg: "bg-purple-50" }
          ].map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-white/50 backdrop-blur-sm">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", feature.bg, feature.color)}>
                <feature.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-slate-700">{feature.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentSearch;

