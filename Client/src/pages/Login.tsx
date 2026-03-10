import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // Login API call
        const response = await fetch(`${API_URL}/users/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Login failed");
        }

        // Store the token and login - handle both response formats
        const token = data.access_token || data.token;
        login(token, data.user);
        
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });

        navigate("/dashboard");
      } else {
        // Register API call with all required fields
        const registerData: any = { 
          email, 
          password,
          name: name || email.split('@')[0], // Use email prefix if name not provided
          role: "analyst" // Default role
        };
        
        // Only include organization if provided
        if (organization.trim()) {
          registerData.organization = organization;
        }

        const response = await fetch(`${API_URL}/users/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Registration failed");
        }

        toast({
          title: "Success",
          description: "Registration successful! Please login.",
        });
        
        // Switch to login mode and clear fields
        setIsLoginMode(true);
        setPassword("");
        setName("");
        setOrganization("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail("");
    setPassword("");
    setName("");
    setOrganization("");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-primary-foreground max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">CreditAI</h1>
          </div>
          <p className="text-xl opacity-90">AI-Powered Credit Analysis Platform</p>
          <p className="opacity-75">Streamline credit appraisal with intelligent document analysis, automated risk scoring, and explainable AI recommendations.</p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {["Smart Analysis", "Risk Scoring", "Auto CAM", "Research Agent"].map((f) => (
              <div key={f} className="bg-primary-foreground/10 rounded-lg p-3 text-sm">{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLoginMode ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription>
              {isLoginMode 
                ? "Sign in to your credit analysis workspace" 
                : "Register to get started with CreditAI"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field - only show in register mode */}
              {!isLoginMode && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="analyst@bank.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
              </div>

              {/* Organization field - optional, only show in register mode */}
              {!isLoginMode && (
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization (Optional)</Label>
                  <Input 
                    id="organization" 
                    type="text" 
                    placeholder="Bank Name" 
                    value={organization} 
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full gradient-primary border-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLoginMode ? "Signing in..." : "Registering..."}
                  </>
                ) : (
                  <>
                    {isLoginMode ? "Sign In" : "Register"} 
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  {isLoginMode 
                    ? "Don't have an account? Register" 
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;