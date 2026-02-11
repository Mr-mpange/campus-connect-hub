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
import PlaceholderPage from "./pages/PlaceholderPage";
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
              <Route path="/notices" element={<PlaceholderPage title="Notices" description="Important announcements and notifications" />} />
              <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="System usage and academic performance analytics" />} />
              <Route path="/audit-log" element={<PlaceholderPage title="Audit Log" description="System activity and change history" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" description="Account and system preferences" />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
