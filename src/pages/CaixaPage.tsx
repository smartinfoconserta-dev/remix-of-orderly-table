import AppLayout from "@/components/AppLayout";

const CaixaPage = () => (
  <AppLayout title="Modo Caixa" showBack>
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="text-primary text-3xl font-black">$</span>
      </div>
      <h2 className="text-foreground text-xl font-bold">Modo Caixa</h2>
      <p className="text-muted-foreground text-sm text-center max-w-xs">
        Fechamento e financeiro serão implementados aqui.
      </p>
    </div>
  </AppLayout>
);

export default CaixaPage;
