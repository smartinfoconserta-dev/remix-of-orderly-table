

## Plano: Corrigir rota `/mesa/:id` para redirecionar ao Cliente

A rota `/mesa/:id` passa a fazer sentido como entrada via QR Code nas mesas, redirecionando para o modo Cliente (autoatendimento) em vez do Garçom.

### Alterações

**1. `src/pages/MesaPage.tsx`** — Trocar destino do redirect de `/garcom` para `/cliente`

```tsx
return <Navigate to={id ? `/cliente?mesa=${id}` : "/cliente"} replace />;
```

**2. `src/pages/ClientePage.tsx`** — Ler o query param `mesa` da URL e usar como mesa pré-selecionada, pulando a etapa de seleção manual quando o parâmetro existir.

### Resultado

- QR Code na mesa (ex: `/mesa/5`) → abre direto no modo cliente com mesa 5 vinculada
- Sem parâmetro → redireciona para `/cliente` normalmente (login + seleção)

