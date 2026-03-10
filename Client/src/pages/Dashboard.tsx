import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Briefcase, Clock, CheckCircle, XCircle, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { caseService } from "@/services/caseService";
import { CreditCase, Company, DashboardStats } from "@/types/creditCase";
import { useToast } from "@/components/ui/use-toast";
import ActivityFeed from "@/components/ActivityFeed";
import { activityService, ActivityLog } from "@/services/activityService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<CreditCase[]>([]);
  const [companies, setCompanies] = useState<Map<string, Company>>(new Map());
  const [camStatus, setCamStatus] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all cases
      const casesData = await caseService.getAllCases();

      // Fetch all companies for mapping
      const companiesData = await caseService.getAllCompanies();
      const companiesMap = new Map(companiesData.map(c => [c._id, c]));
      setCompanies(companiesMap);

      // Fetch CAM status for each case
      const camStatusMap = new Map();
      for (const caseItem of casesData) {
        try {
          const camReports = await caseService.getCAMReports(caseItem._id);
          camStatusMap.set(caseItem._id, camReports.length > 0 ? "Generated" : "Pending");
        } catch (error) {
          camStatusMap.set(caseItem._id, "Pending");
        }
      }
      setCamStatus(camStatusMap);

      // Enrich cases with company data
      const enrichedCases = casesData.map(caseItem => ({
        ...caseItem,
        companyName: companiesMap.get(caseItem.companyId)?.companyName || "Unknown Company",
        sector: companiesMap.get(caseItem.companyId)?.sector || "Unknown Sector",
        camStatus: camStatusMap.get(caseItem._id) || "Pending",
      }));

      setCases(enrichedCases);

      // Calculate stats
      setStats(caseService.calculateStats(enrichedCases));

      // Fetch recent logs
      const logsData = await activityService.getGlobalLogs(10);
      setLogs(logsData);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter cases based on search
  const filteredCases = cases.filter(c =>
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.sector?.toLowerCase().includes(search.toLowerCase()) ||
    c.loanPurpose?.toLowerCase().includes(search.toLowerCase())
  );

  // Handle case click - navigate to case details
  const handleCaseClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const statsCards = [
    {
      label: "Total Cases",
      value: stats.totalCases,
      icon: Briefcase,
      color: "bg-blue-500"
    },
    {
      label: "Under Review",
      value: stats.underReview,
      icon: Clock,
      color: "bg-yellow-500"
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "bg-green-500"
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "bg-red-500"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email || 'Analyst'}
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Split layout for Table and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Credit Cases Table */}
        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Credit Cases</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases..."
                  className="pl-9 w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => navigate("/create-case")}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Case
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No cases found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {search ? "Try adjusting your search" : "Get started by creating a new case"}
                </p>
                {!search && (
                  <Button onClick={() => navigate("/create-case")}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Case
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Loan Request</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>CAM Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((creditCase) => (
                      <TableRow
                        key={creditCase._id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleCaseClick(creditCase._id)}
                      >
                        <TableCell className="font-medium">{creditCase.companyName}</TableCell>
                        <TableCell>{creditCase.sector}</TableCell>
                        <TableCell>₹{(creditCase.loanRequestAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{creditCase.loanPurpose}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            creditCase.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              creditCase.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                                creditCase.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                          }>
                            {creditCase.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {creditCase.riskScore !== undefined && creditCase.riskScore !== null ? (
                            <span className={`font-semibold ${creditCase.riskScore >= 70 ? 'text-green-600' :
                                creditCase.riskScore >= 40 ? 'text-yellow-600' :
                                  'text-red-600'
                              }`}>
                              {creditCase.riskScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            (creditCase.camStatus || "Pending") === "Generated"
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }>
                            {creditCase.camStatus || "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Sidebar */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={() => navigate("/activity-log")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <ActivityFeed logs={logs} loading={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;