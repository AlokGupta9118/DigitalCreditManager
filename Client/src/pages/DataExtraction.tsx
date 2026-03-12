import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Loader2, 
  Building2, 
  FileText, 
  Calendar, 
  Eye, 
  Database,
  Search
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { companyService, Company } from "@/services/companyService";
import { caseService } from "@/services/caseService";
import { documentService, Document } from "@/services/documentService";
import { CreditCase } from "@/types/creditCase";
import { Badge } from "@/components/ui/badge";
import ExtractedDataView from "./ExtractedDataView";

const DataExtraction = () => {
  const { state, setSelectedCompanyId, setSelectedCaseId } = useWorkflow();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cases, setCases] = useState<CreditCase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection state
  const selectedCompanyId = state.selectedCompanyId || "";
  const selectedCaseId = state.selectedCaseId || "";

  // View state
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchCases(selectedCompanyId);
    } else {
      setCases([]);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchDocuments(selectedCaseId);
    } else {
      setDocuments([]);
    }
  }, [selectedCaseId]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies", error);
    }
  };

  const fetchCases = async (companyId: string) => {
    try {
      const data = await caseService.getCasesByCompany(companyId);
      setCases(data);
    } catch (error) {
      console.error("Failed to fetch cases", error);
    }
  };

  const fetchDocuments = async (caseId: string) => {
    try {
      setLoading(true);
      const data = await documentService.getDocumentsByCase(caseId);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Extracted':
        return <Badge className="bg-success/10 text-success border-success/20">Extracted</Badge>;
      case 'Processing':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>;
      case 'Error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="gradient-primary-light rounded-xl p-6">
        <h2 className="text-lg font-semibold">Data Extraction Hub</h2>
        <p className="text-sm text-muted-foreground">View and verify AI-extracted fields from financial documents</p>
      </div>

      {/* Case Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Select Credit Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Company</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c._id} value={c._id || ""}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCompanyId && (
              <div>
                <label className="text-xs font-medium mb-1 block">Credit Case</label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.loanPurpose} - {c._id.slice(-6)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Documents Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Ingested Documents & Extraction Status
            </span>
            {selectedCaseId && (
              <Button variant="ghost" size="sm" onClick={() => fetchDocuments(selectedCaseId)} disabled={loading}>
                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </CardTitle>
          <CardDescription>All documents uploaded for this case and their parsing status</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedCaseId ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mb-4 opacity-20" />
              <p>Please select a credit case to view extracted data</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">No documents found for this case.</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => window.location.hash = '#/upload'}>
                Go to Document Upload
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc._id}>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{doc.documentType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.fileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {doc.financialYear}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="gap-2"
                        disabled={doc.status !== 'Extracted'}
                        onClick={() => setSelectedDoc({ id: doc._id, name: doc.fileName })}
                      >
                        <Eye className="h-4 w-4" /> View Data
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Modal */}
      {selectedDoc && (
        <ExtractedDataView
          documentId={selectedDoc.id}
          documentName={selectedDoc.name}
          open={!!selectedDoc}
          onOpenChange={(open) => !open && setSelectedDoc(null)}
        />
      )}
    </div>
  );
};

export default DataExtraction;
