import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/create-case": "Create Credit Case",
  "/documents": "Document Upload",
  "/extraction": "Data Extraction Results",
  "/search": "Document Search",
  "/research": "Research Agent",
  "/due-diligence": "Due Diligence Notes",
  "/risk-scoring": "Risk Scoring",
  "/recommendation": "Loan Recommendation",
  "/cam-generator": "CAM Report Generator",
  "/activity-log": "Activity Log",
};

export function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "CreditAI";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full gradient-primary" />
              </Button>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
