import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./dashboards/AdminDashboard";
import LecturerDashboard from "./dashboards/LecturerDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import HodDashboard from "./dashboards/HodDashboard";

const Dashboard = () => {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "admin": return <AdminDashboard />;
    case "lecturer": return <LecturerDashboard />;
    case "hod": return <HodDashboard />;
    case "student": return <StudentDashboard />;
  }
};

export default Dashboard;
