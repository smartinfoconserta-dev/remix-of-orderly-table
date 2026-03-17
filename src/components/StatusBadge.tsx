interface StatusBadgeProps {
  status: "livre" | "pendente" | "consumo";
}

const labels: Record<string, string> = {
  livre: "Livre",
  pendente: "Pendente",
  consumo: "Em consumo",
};

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className={`status-badge-${status} text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-md`}
  >
    {labels[status]}
  </span>
);

export default StatusBadge;
