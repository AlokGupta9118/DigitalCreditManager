import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/create-case": "Create Credit Case",
  "/documents": "Document Upload",
  "/extraction": "Data Extraction Results",
  "/search": "Document Search",
  "/research": "Research Agent",
  "/due-diligence": "Due Diligence Notes",
  "/risk-scoring": "Credit Appraisal",
  "/recommendation": "Loan Recommendation",
  "/cam-generator": "CAM Report Generator",
  "/activity-log": "Activity Log",
};

export function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "CreditAI";
  const { user, logout } = useAuth();

  const userName = user?.name || user?.full_name || "User";
  const userRole = user?.role || "Credit Officer";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#f8fafc]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 transition-colors" />
              <div className="h-6 w-[1px] bg-slate-200 mx-1" />
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-600">System Live</span>
              </div>
              <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-full h-10 w-10">
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 pl-2 border-l border-slate-100 ml-2 cursor-pointer group">
                    <div className="flex flex-col items-end hidden sm:flex">
                      <span className="text-sm font-semibold text-slate-900 leading-none">{userName}</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">{userRole}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm group-hover:bg-primary transition-colors">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="text-xs text-slate-500">{userRole}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-slate-700 focus:bg-slate-50">
                    <Settings className="mr-2.5 h-4 w-4 text-slate-400" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
