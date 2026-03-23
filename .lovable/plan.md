

## Plano: Logo quadrada maior na sidebar do tablet

### Problema
No modo "quadrada", a logo aparece pequena (40x40px) no header. O usuário quer que, no tablet (sidebar visível), a logo quadrada ocupe a largura da sidebar (~11rem), acompanhando o tamanho dos botões de categoria.

### Mudança

**Arquivo: `src/components/PedidoFlow.tsx`**

Na `aside` da sidebar (linha ~1092), adicionar a logo como bloco grande no topo, antes da `nav` de categorias:

```tsx
{RESTAURANTE.logoUrl && logoEstilo === "quadrada" && (
  <div className="mb-3 px-1">
    <img
      src={RESTAURANTE.logoUrl}
      alt={RESTAURANTE.nome}
      className="w-full aspect-square rounded-2xl object-cover border border-border shadow-sm"
    />
  </div>
)}
{RESTAURANTE.logoUrl && logoEstilo === "circular" && (
  <div className="mb-3 flex justify-center">
    <img
      src={RESTAURANTE.logoUrl}
      alt={RESTAURANTE.nome}
      className="h-20 w-20 rounded-full object-cover border border-border shadow-sm"
    />
  </div>
)}
{!RESTAURANTE.logoUrl && (
  <div className="mb-3 flex justify-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary border border-border">
      <span className="text-lg font-black text-foreground">{RESTAURANTE.logoFallback}</span>
    </div>
  </div>
)}
```

A logo quadrada ocupa a largura total da sidebar (~11rem/13rem) como um bloco quadrado com `aspect-square`, acompanhando visualmente a lista de categorias abaixo. No modo circular, aparece centralizada como avatar grande. Sem logo, mostra iniciais.

### Resultado
- Modo quadrado: logo grande quadrada na largura da sidebar, acima das categorias
- Modo circular: logo circular centralizada (80px)
- Sem logo: iniciais em bloco
- Header continua com a logo pequena normalmente

