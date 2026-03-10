import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateCase from "./pages/CreateCase";
import DocumentUpload from "./pages/DocumentUpload";
import DataExtraction from "./pages/DataExtraction";
import DocumentSearch from "./pages/DocumentSearch";
import ResearchAgent from "./pages/ResearchAgent";
import DueDiligence from "./pages/DueDiligence";
import RiskScoring from "./pages/RiskScoring";
import LoanRecommendation from "./pages/LoanRecommendation";
import CAMGenerator from "./pages/CAMGenerator";
import ActivityLog from "./pages/ActivityLog";
import NotFound from "./pages/NotFound";
import CaseDetails from "./pages/CaseDetails";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <WorkflowProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route element={<AppLayout />}>
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/create-case" 
                    element={
                      <ProtectedRoute>
                        <CreateCase />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/documents" 
                    element={
                      <ProtectedRoute>
                        <DocumentUpload />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/cases/:caseId" 
                    element={
                      <ProtectedRoute>
                        <CaseDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/extraction" 
                    element={
                      <ProtectedRoute>
                        <DataExtraction />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/search" 
                    element={
                      <ProtectedRoute>
                        <DocumentSearch />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/research" 
                    element={
                      <ProtectedRoute>
                        <ResearchAgent />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/due-diligence" 
                    element={
                      <ProtectedRoute>
                        <DueDiligence />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/risk-scoring" 
                    element={
                      <ProtectedRoute>
                        <RiskScoring />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/recommendation" 
                    element={
                      <ProtectedRoute>
                        <LoanRecommendation />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/cam-generator" 
                    element={
                      <ProtectedRoute>
                        <CAMGenerator />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/activity-log" 
                    element={
                      <ProtectedRoute>
                        <ActivityLog />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
              </Routes>
            </WorkflowProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;