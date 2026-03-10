import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Building, 
  Hash,
  AlertCircle,
  Download,
  Copy,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { documentService } from "@/services/documentService";

interface ExtractedDataViewProps {
  documentId: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedField {
  [key: string]: any;
}

const ExtractedDataView = ({ 
  documentId, 
  documentName, 
  open, 
  onOpenChange 
}: ExtractedDataViewProps) => {
  const [loading, setLoading] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedField | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string>("Processing");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && documentId) {
      fetchExtractedData();
    }
  }, [open, documentId]);

 // In your ExtractedDataView.tsx, update the fetchExtractedData function:

const fetchExtractedData = async () => {
  try {
    setLoading(true);
    const response = await documentService.getExtractedData(documentId);
    
    if (response.status === "Extracted" && response.data) {
      setExtractedData(response.data);
      setExtractionStatus("Extracted");
    } else {
      setExtractedData(null);
      setExtractionStatus(response.status || "Processing");
      
      // If still processing, poll for updates - but only if modal is still open
      if (response.status === "Processing" && open) {
        const timeoutId = setTimeout(fetchExtractedData, 3000);
        return () => clearTimeout(timeoutId);
      }
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to fetch extracted data",
      variant: "destructive",
    });
    setExtractionStatus("Error");
  } finally {
    setLoading(false);
  }
};

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A";
    
    // Format currency values
    if (typeof value === "number" && 
        (key.toLowerCase().includes("amount") || 
         key.toLowerCase().includes("revenue") ||
         key.toLowerCase().includes("profit") ||
         key.toLowerCase().includes("expense") ||
         key.toLowerCase().includes("turnover") ||
         key.toLowerCase().includes("income"))) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }
    
    // Format dates
    if (key.toLowerCase().includes("date") && value) {
      try {
        return new Date(value).toLocaleDateString('en-IN');
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const getFieldIcon = (key: string) => {
    if (key.toLowerCase().includes("date") || key.toLowerCase().includes("year")) {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
    if (key.toLowerCase().includes("amount") || 
        key.toLowerCase().includes("revenue") ||
        key.toLowerCase().includes("profit") ||
        key.toLowerCase().includes("income") ||
        key.toLowerCase().includes("turnover")) {
      return <DollarSign className="h-4 w-4 text-green-500" />;
    }
    if (key.toLowerCase().includes("name") || key.toLowerCase().includes("company")) {
      return <Building className="h-4 w-4 text-purple-500" />;
    }
    if (key.toLowerCase().includes("id") || key.toLowerCase().includes("number") || key.toLowerCase().includes("pan") || key.toLowerCase().includes("gst")) {
      return <Hash className="h-4 w-4 text-orange-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const copyToClipboard = () => {
    if (extractedData) {
      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Extracted data copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadAsJSON = () => {
    if (extractedData) {
      const dataStr = JSON.stringify(extractedData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `extracted-data-${documentId}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const renderDataAsTable = () => {
    if (!extractedData || Object.keys(extractedData).length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>No extracted data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(extractedData).map(([section, fields]) => {
          // Handle nested objects
          if (typeof fields === "object" && fields !== null && !Array.isArray(fields)) {
            return (
              <div key={section} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium border-b">
                  {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(fields).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getFieldIcon(key)}
                          <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                        <div className="font-medium pl-6">
                          {formatValue(key, value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          
          // Handle arrays
          if (Array.isArray(fields)) {
            return (
              <div key={section} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium border-b">
                  {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="p-4">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {fields.map((item, index) => (
                        <div key={index} className="p-2 bg-muted/30 rounded">
                          {typeof item === "object" ? (
                            <pre className="text-xs">
                              {JSON.stringify(item, null, 2)}
                            </pre>
                          ) : (
                            <span>{String(item)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            );
          }
          
          // Handle primitive values
          return (
            <div key={section} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {getFieldIcon(section)}
                <span>{section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div className="font-medium text-lg pl-6">
                {formatValue(section, fields)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDataAsJSON = () => {
    if (!extractedData) {
      return <p className="text-muted-foreground">No data available</p>;
    }
    
    return (
      <ScrollArea className="h-[400px] w-full">
        <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(extractedData, null, 2)}
        </pre>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Data: {documentName}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={extractionStatus === "Extracted" ? "default" : "secondary"}>
                {extractionStatus}
              </Badge>
              {extractionStatus === "Processing" && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Extraction in progress...
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : extractionStatus === "Error" ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-destructive">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Extraction Failed</p>
            <p className="text-sm text-muted-foreground">
              There was an error extracting data from this document
            </p>
          </div>
        ) : !extractedData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Data Extracted</p>
            <p className="text-sm text-muted-foreground">
              This document hasn't been processed yet or contains no extractable data
            </p>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={!extractedData}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsJSON}
                disabled={!extractedData}
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>

            {/* Data Display Tabs */}
            <Tabs defaultValue="formatted" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="formatted">Formatted View</TabsTrigger>
                <TabsTrigger value="json">Raw JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="formatted" className="overflow-auto max-h-[400px]">
                <ScrollArea className="h-full">
                  <div className="p-1">
                    {renderDataAsTable()}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="json" className="overflow-auto max-h-[400px]">
                {renderDataAsJSON()}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExtractedDataView;