import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  headerRight?: React.ReactNode;
  onBack?: () => void;
}

const AppLayout = ({ title, children, showBack = false, headerRight, onBack }: AppLayoutProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-surface shrink-0">
        {showBack && (
          <button
            onClick={handleBack}
            className="surface-card flex items-center justify-center w-10 h-10 rounded-md"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <h1 className="text-foreground text-lg md:text-xl font-bold tracking-tight truncate flex-1">
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
