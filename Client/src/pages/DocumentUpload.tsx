import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle, Loader2, AlertCircle, X, ArrowLeft, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { documentService, Document, DocumentCategory } from "@/services/documentService";
import ExtractedDataView from "./ExtractedDataView";

interface DocumentUploadProps {
  caseId?: string;
}

const categories: DocumentCategory[] = [
  "GST Returns", "Bank Statements", "ITR", "Balance Sheet",
  "Annual Report", "Board Minutes", "Rating Report", "Sanction Letter", "Legal Notice",
];

const statusIcons = {
  Uploaded: <FileText className="h-4 w-4 text-blue-500" />,
  Processing: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
  Extracted: <CheckCircle className="h-4 w-4 text-green-500" />,
  Error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const DocumentUpload = ({ caseId: propCaseId }: DocumentUploadProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const creditCaseId = propCaseId || searchParams.get('caseId');
  
  const [dragOver, setDragOver] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<DocumentCategory>>(new Set());
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [selectedDocForExtraction, setSelectedDocForExtraction] = useState<{id: string, name: string} | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
  });

  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Use ref to track if initial fetch is done
  const initialFetchDone = useRef(false);

  // Financial years
  const financialYears = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return `${year}-${(year + 1).toString().slice(2)}`;
  });

  // Fetch documents function
  const fetchDocuments = useCallback(async (showLoading = true) => {
    if (!creditCaseId || !isMounted.current) return;
    
    if (showLoading) setLoading(true);
    
    try {
      const docs = await documentService.getDocumentsByCase(creditCaseId);
      if (isMounted.current) {
        setDocuments(docs);
      }
    } catch (error: any) {
      console.error("Failed to fetch documents:", error);
      if (isMounted.current && showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch documents. Please refresh.",
          variant: "destructive",
        });
      }
    } finally {
      if (isMounted.current && showLoading) {
        setLoading(false);
      }
    }
  }, [creditCaseId, toast]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    
    if (creditCaseId && !initialFetchDone.current) {
      fetchDocuments(true);
      initialFetchDone.current = true;
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [creditCaseId, fetchDocuments]);

  // Poll for updates - but only every 10 seconds and only if there are processing documents
  useEffect(() => {
    if (!creditCaseId) return;

    const checkForProcessingDocs = () => {
      const hasProcessing = documents.some(doc => doc.status === 'Processing');
      return hasProcessing;
    };

    const interval = setInterval(() => {
      if (isMounted.current && creditCaseId) {
        // Only fetch if there are documents in Processing state
        if (checkForProcessingDocs()) {
          fetchDocuments(false);
        }
      }
    }, 10000); // Increased to 10 seconds

    return () => clearInterval(interval);
  }, [creditCaseId, documents, fetchDocuments]);

  const toggleCat = (cat: DocumentCategory) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (selectedCats.size === 0) {
      toast({
        title: "No Category Selected",
        description: "Please select at least one document category before uploading.",
        variant: "destructive",
      });
      return;
    }

    if (!creditCaseId) {
      toast({
        title: "No Case Selected",
        description: "Please select a case first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const category = Array.from(selectedCats)[0];
        
        // Show upload progress
        setUploadProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(file.name, 10);
          return newMap;
        });

        try {
          // Upload file
          const result = await documentService.uploadDocument(
            file,
            creditCaseId,
            category,
            selectedYear
          );
          
          // Upload complete - set to 100%
          setUploadProgress(prev => {
            const newMap = new Map(prev);
            newMap.set(file.name, 100);
            return newMap;
          });
          
          // Remove progress after 1.5 seconds
          setTimeout(() => {
            if (isMounted.current) {
              setUploadProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(file.name);
                return newMap;
              });
            }
          }, 1500);
          
          return result;
        } catch (error: any) {
          setUploadProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(file.name);
            return newMap;
          });
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      // Immediately fetch updated documents
      await fetchDocuments(false);
      
      toast({
        title: "Success",
        description: `Successfully uploaded ${files.length} file(s). Extraction started in background.`,
      });
      
      // Clear selected categories after successful upload
      setSelectedCats(new Set());
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [selectedCats, creditCaseId, selectedYear, toast, fetchDocuments]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileUpload(e.target.files);
    e.target.value = '';
  }, [handleFileUpload]);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (documentId: string) => {
    const viewUrl = documentService.getDocumentViewUrl(documentId);
    window.open(viewUrl, '_blank');
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const blob = await documentService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleViewExtractedData = (documentId: string, fileName: string) => {
    setSelectedDocForExtraction({ id: documentId, name: fileName });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentStats = () => {
    const total = documents.length;
    const extracted = documents.filter(d => d.status === 'Extracted').length;
    const processing = documents.filter(d => d.status === 'Processing').length;
    const error = documents.filter(d => d.status === 'Error').length;
    const uploaded = documents.filter(d => d.status === 'Uploaded').length;
    
    return { total, extracted, processing, error, uploaded };
  };

  const stats = getDocumentStats();

  if (!creditCaseId) {
    return (
      <div className="space-y-6">
        {!propCaseId && (
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        )}
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">No Case Selected</h3>
            <p className="text-muted-foreground mb-4">
              Please select a credit case first to upload documents.
            </p>
            {!propCaseId && (
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!propCaseId && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <Badge variant="outline" className="text-sm">
            Case ID: {creditCaseId}
          </Badge>
        </div>
      )}

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Uploaded</p>
            <p className="text-2xl font-bold text-blue-600">{stats.uploaded}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.processing}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Extracted</p>
            <p className="text-2xl font-bold text-green-600">{stats.extracted}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-600">{stats.error}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Financial Year Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Financial Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  disabled={uploading}
                >
                  {financialYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors relative
                  ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                  ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">
                  {dragOver ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  PDF, Excel, CSV, JSON files supported (Max 10MB each)
                </p>
                <p className="text-xs text-primary mb-2">
                  Files upload instantly, extraction runs in background
                </p>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  Browse Files
                </Button>
              </div>

              {/* Upload Progress */}
              {uploadProgress.size > 0 && (
                <div className="mt-4 space-y-2">
                  {Array.from(uploadProgress.entries()).map(([fileName, progress]) => (
                    <div key={fileName} className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate max-w-[200px]">{fileName}</span>
                        <span>{progress === 100 ? 'Uploaded' : `${progress}%`}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {progress === 100 && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Upload complete. Extraction started...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedCats.size > 0 && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedCats).map(cat => (
                      <Badge key={cat} variant="secondary" className="px-3 py-1">
                        {cat}
                        <button
                          onClick={() => toggleCat(cat)}
                          className="ml-2 hover:text-destructive"
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Categories Sidebar */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Document Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((cat) => (
              <label 
                key={cat} 
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors
                  ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input 
                  type="checkbox" 
                  className="rounded border-border" 
                  checked={selectedCats.has(cat)} 
                  onChange={() => toggleCat(cat)}
                  disabled={uploading}
                />
                <span className="text-sm">{cat}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Files Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No documents uploaded yet</p>
              <p className="text-sm text-muted-foreground">
                Drag and drop files or browse to upload documents for this case
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.documentType}</Badge>
                      </TableCell>
                      <TableCell>{doc.financialYear}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[doc.status as keyof typeof statusIcons] || statusIcons.Uploaded}
                          <span className="text-sm">{doc.status}</span>
                          {doc.status === 'Processing' && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                              (Extracting...)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewExtractedData(doc._id, doc.fileName)}
                            className={doc.status === 'Extracted' ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground'}
                            title={doc.status === 'Extracted' ? 'View extracted data' : 'Extraction in progress'}
                            disabled={doc.status !== 'Extracted'}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc._id)}
                            className="hover:text-primary"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc._id, doc.fileName)}
                            className="hover:text-primary"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="text-destructive hover:text-destructive/90"
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Modal */}
      {selectedDocForExtraction && (
        <ExtractedDataView
          documentId={selectedDocForExtraction.id}
          documentName={selectedDocForExtraction.name}
          open={!!selectedDocForExtraction}
          onOpenChange={(open) => !open && setSelectedDocForExtraction(null)}
        />
      )}
    </div>
  );
};

export default DocumentUpload;