import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { mockSearchResults } from "@/data/mockData";

const DocumentSearch = () => {
  const [query, setQuery] = useState("");
  const results = query.length > 0 ? mockSearchResults : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder='Search inside documents (e.g. "Debt", "Revenue", "Collateral")' className="pl-12 h-12 text-base" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{results.length} results found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 hover:shadow-card-hover transition-shadow cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{r.documentName}</span>
                  <Badge variant="outline" className="text-xs">{r.category}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">Page {r.page}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">...{r.snippet}...</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {query.length > 0 && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default DocumentSearch;
