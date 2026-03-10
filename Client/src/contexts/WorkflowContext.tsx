import React, { createContext, useContext, useState, useEffect } from 'react';

interface WorkflowState {
  selectedCompanyId: string | null;
  selectedCaseId: string | null;
  activeResearchId: string | null;
  activeRiskId: string | null;
}

interface WorkflowContextType {
  state: WorkflowState;
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedCaseId: (id: string | null) => void;
  setActiveResearchId: (id: string | null) => void;
  setActiveRiskId: (id: string | null) => void;
  clearWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from sessionStorage to survive page refreshes (not just navigation)
  const [state, setState] = useState<WorkflowState>(() => {
    const saved = sessionStorage.getItem('workflow_state');
    return saved ? JSON.parse(saved) : {
      selectedCompanyId: null,
      selectedCaseId: null,
      activeResearchId: null,
      activeRiskId: null,
    };
  });

  useEffect(() => {
    sessionStorage.setItem('workflow_state', JSON.stringify(state));
  }, [state]);

  const setSelectedCompanyId = (id: string | null) => 
    setState(prev => ({ ...prev, selectedCompanyId: id, selectedCaseId: null })); // Clear case when company changes
  
  const setSelectedCaseId = (id: string | null) => 
    setState(prev => ({ ...prev, selectedCaseId: id }));

  const setActiveResearchId = (id: string | null) => 
    setState(prev => ({ ...prev, activeResearchId: id }));

  const setActiveRiskId = (id: string | null) => 
    setState(prev => ({ ...prev, activeRiskId: id }));

  const clearWorkflow = () => 
    setState({
      selectedCompanyId: null,
      selectedCaseId: null,
      activeResearchId: null,
      activeRiskId: null,
    });

  return (
    <WorkflowContext.Provider value={{ 
      state, 
      setSelectedCompanyId, 
      setSelectedCaseId, 
      setActiveResearchId, 
      setActiveRiskId,
      clearWorkflow 
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
