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
              <Route path="/departments" element={<PlaceholderPage title="Departments" description="Manage academic departments" />} />
              <Route path="/users" element={<PlaceholderPage title="User Management" description="Manage students, lecturers, and administrators" />} />
              <Route path="/courses" element={<PlaceholderPage title="Courses" description="Course allocation and management" />} />
              <Route path="/results" element={<PlaceholderPage title="Results Management" description="Upload, review, and manage academic results" />} />
              <Route path="/approvals" element={<PlaceholderPage title="Approvals" description="Review and approve submitted results" />} />
              <Route path="/my-results" element={<PlaceholderPage title="My Results" description="View your academic results and transcript" />} />
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
