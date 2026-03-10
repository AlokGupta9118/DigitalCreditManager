import {
  LayoutDashboard, PlusCircle, Upload, TableProperties, Search,
  Globe, ClipboardCheck, Gauge, ThumbsUp, FileText, Clock, CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Cases",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Create Case", url: "/create-case", icon: PlusCircle },
    ],
  },
  {
    label: "Data",
    items: [
      { title: "Document Upload", url: "/documents", icon: Upload },
      { title: "Extraction Results", url: "/extraction", icon: TableProperties },
      { title: "Document Search", url: "/search", icon: Search },
    ],
  },
  {
    label: "Analysis",
    items: [
      { title: "Research Agent", url: "/research", icon: Globe },
      { title: "Due Diligence", url: "/due-diligence", icon: ClipboardCheck },
      { title: "Risk Scoring", url: "/risk-scoring", icon: Gauge },
    ],
  },
  {
    label: "Output",
    items: [
      { title: "Recommendation", url: "/recommendation", icon: ThumbsUp },
      { title: "CAM Generator", url: "/cam-generator", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Activity Log", url: "/activity-log", icon: Clock },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg gradient-text whitespace-nowrap">CreditAI</span>
          )}
        </div>

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
