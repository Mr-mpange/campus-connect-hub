import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import UserManagement from "./pages/UserManagement";
import ResultsUpload from "./pages/ResultsUpload";
import Courses from "./pages/Courses";
import Approvals from "./pages/Approvals";
import MyResults from "./pages/MyResults";
import MyCourses from "./pages/MyCourses";
import Payments from "./pages/Payments";
import AuditLog from "./pages/AuditLog";
import Notices from "./pages/Notices";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import HodDashboard from "./pages/dashboards/HodDashboard";
import PaymentVerification from "./pages/PaymentVerification";
import UssdSimulator from "./pages/UssdSimulator";
import UssdLogs from "./pages/UssdLogs";
import UssdAnalytics from "./pages/UssdAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/results" element={<ResultsUpload />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/my-results" element={<MyResults />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/payment-verification" element={<PaymentVerification />} />
              <Route path="/lecturer-assignment" element={<HodDashboard />} />
              <Route path="/ussd-simulator" element={<UssdSimulator />} />
              <Route path="/ussd-logs" element={<UssdLogs />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
