import AppLayout from "@/components/AppLayout";

const ClientePage = () => {
  return (
    <AppLayout title="Modo Cliente" showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-3xl font-black">C</span>
        </div>
        <h2 className="text-foreground text-xl font-bold">Modo Cliente</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          O cardápio digital e autoatendimento serão implementados aqui.
        </p>
      </div>
    </AppLayout>
  );
};

export default ClientePage;
