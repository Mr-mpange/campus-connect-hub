interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

const PageHeader = ({ title, description, children }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
      {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
  </div>
);

export default PageHeader;
