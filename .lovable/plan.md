
## Problema identificado

O erro principal está no `ProtectedRoute` atual:

- ele decide acesso pela **sessão/slot** (`currentGarcom`, `currentCaixa`, `currentGerente`)
- mas a hierarquia real deve decidir pelo **papel do usuário logado**
- resultado: a navegação quebra em casos como:
  - gerente logado no slot do caixa não consegue abrir `/gerente`
  - redirecionamentos parecem “nada acontece”
  - permissões ficam inconsistentes quando existe sessão válida em slot diferente

Também há um detalhe no `GerentePage`: `useRouteLock` foi importado, mas não está sendo chamado.

## O que vou corrigir

### 1. Revisar `ProtectedRoute.tsx`
Trocar a lógica baseada em “qual slot está preenchido” por lógica baseada em “qual role está ativo nas sessões”.

Novo comportamento:
- sem nenhuma sessão ativa: mostra a página de login
- com sessão ativa de role permitida: libera a rota
- com sessão ativa de role não permitida: redireciona para `/`

Tabela aplicada:
```text
/garcom  -> garcom, caixa, gerente
/caixa   -> caixa, gerente
/gerente -> gerente
admin    -> bypass total via seed-admin-001
```

### 2. Preservar o bypass do admin
No guard, considerar o seed `id === "seed-admin-001"` como acesso total, igual ao restante do sistema.

### 3. Ajustar a leitura das sessões ativas
Usar os usuários atuais (`currentGarcom`, `currentCaixa`, `currentGerente`) como lista de usuários ativos e validar o `role` deles, não apenas o nome do slot.

Isso evita o bug clássico:
```text
gerente logado em /caixa -> currentCaixa.role === "gerente"
-> deve poder abrir /gerente
```

### 4. Corrigir `GerentePage.tsx`
Verificar e restaurar o `useRouteLock("/gerente")`, porque hoje ele está importado mas aparentemente não está sendo executado.

### 5. Validar sem mexer no restante da auth
Não vou alterar:
- auto-cadastro do garçom
- seed admin
- `loginWithPin`
- regras de criação de usuários

A ideia é corrigir a navegação/hierarquia sem quebrar o que já funciona no login.

## Resultado esperado

Depois da correção:

- garçom logado:
  - entra em `/garcom`
  - entra em `/mesa/:id`
  - não entra em `/caixa`
  - não entra em `/gerente`

- caixa logado:
  - entra em `/caixa`
  - entra em `/garcom`
  - entra em `/mesa/:id`
  - não entra em `/gerente`

- gerente logado:
  - entra em `/gerente`
  - entra em `/caixa`
  - entra em `/garcom`
  - entra em `/mesa/:id`

- admin:
  - entra em tudo

## Detalhes técnicos

Arquivos a revisar:
- `src/components/ProtectedRoute.tsx`
- `src/pages/GerentePage.tsx`

Possível ajuste central no guard:
```text
1. montar lista de usuários ativos
2. se houver admin seed -> acesso liberado
3. mapear roles permitidos por rota
4. se algum usuário ativo tiver role permitido -> acesso liberado
5. se não houver sessão -> renderiza login
6. caso contrário -> Navigate("/")
```

## Verificação final

Vou considerar a correção concluída apenas se passar nestes cenários:

1. sem login, `/garcom`, `/caixa`, `/gerente` mostram formulário
2. garçom logado tenta `/caixa` -> bloqueado
3. caixa logado tenta `/gerente` -> bloqueado
4. caixa logado tenta `/garcom` -> liberado
5. gerente logado tenta `/caixa` -> liberado
6. gerente logado tenta `/garcom` -> liberado
7. gerente abre `/gerente` normalmente
8. admin continua com acesso total
9. TypeScript sem erros
