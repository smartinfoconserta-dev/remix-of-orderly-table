export function sendWhatsAppMessage(telefone: string, mensagem: string): void {
  const tel = telefone.replace(/\D/g, "");
  if (!tel || tel.length < 10) return;
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

export function buildDeliveryStatusMessage(
  nomeRestaurante: string,
  numeroPedido: number,
  clienteNome: string,
  status: "confirmado" | "saiu" | "entregue",
  extras?: { tempoEstimado?: string; motoboyNome?: string; total?: number },
): string {
  const num = String(numeroPedido).padStart(3, "0");
  switch (status) {
    case "confirmado":
      return [
        `Olá ${clienteNome}! Seu pedido #${num} do ${nomeRestaurante} foi confirmado! ✅`,
        extras?.tempoEstimado ? `🕐 Tempo estimado: ${extras.tempoEstimado}` : "",
        extras?.total ? `💰 Total: R$ ${extras.total.toFixed(2).replace(".", ",")}` : "",
        `Obrigado! 😊`,
      ]
        .filter(Boolean)
        .join("\n");
    case "saiu":
      return [
        `${clienteNome}, seu pedido #${num} saiu para entrega! 🛵`,
        extras?.motoboyNome ? `Entregador: ${extras.motoboyNome}` : "",
        `Aguarde em breve!`,
      ]
        .filter(Boolean)
        .join("\n");
    case "entregue":
      return `${clienteNome}, seu pedido #${num} foi entregue! ✅ Obrigado pela preferência! 🙏`;
  }
}
