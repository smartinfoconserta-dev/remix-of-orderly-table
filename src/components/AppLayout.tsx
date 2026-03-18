import { ArrowLeft } from "lucide-react";

export interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  headerRight?: React.ReactNode;
  onBack?: () => void;
}

const AppLayout = ({ title, children, showBack = false, headerRight, onBack }: AppLayoutProps) => {
  const shouldShowBack = showBack && Boolean(onBack);

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-4 shrink-0 md:px-6">
        {shouldShowBack && (
          <button
            onClick={onBack}
            className="surface-card flex h-10 w-10 items-center justify-center rounded-md"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
          {title}
        </h1>
        {headerRight && <div className="flex items-center shrink-0">{headerRight}</div>}
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
