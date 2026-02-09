import PageHeader from "@/components/shared/PageHeader";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => (
  <div>
    <PageHeader title={title} description={description} />
    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg">
      <Construction className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-sm font-medium text-foreground">Coming Soon</p>
      <p className="text-xs text-muted-foreground mt-1">This module is under development</p>
    </div>
  </div>
);

export default PlaceholderPage;
