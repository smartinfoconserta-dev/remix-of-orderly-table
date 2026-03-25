

## Admin com acesso a todas as páginas operacionais

Faz total sentido. O admin é o dono do restaurante -- ele precisa poder entrar em qualquer módulo (cozinha, caixa, garçom, etc.) para acompanhar em tempo real o que está acontecendo, sem precisar de um PIN operacional.

### Alteração

**Arquivo: `src/components/ProtectedRoute.tsx`**

Atualizar a lógica do nível `operational` para também permitir acesso de `admin` e `master`:

```text
Antes:
  operational → só authLevel === "operational"

Depois:
  operational → authLevel === "operational" OU "admin" OU "master"
```

- Admin e master passam em qualquer rota operacional, independente do `requiredModule`
- Operacional continua restrito ao seu módulo específico (garçom só acessa garçom, etc.)

### Resultado

| Usuário | /garcom | /caixa | /cozinha | /admin | /master |
|---------|---------|--------|----------|--------|---------|
| Master | sim | sim | sim | sim | sim |
| Admin | sim | sim | sim | sim | nao |
| Operacional (garçom) | sim | nao | nao | nao | nao |

Apenas 1 arquivo alterado, ~3 linhas de código.

