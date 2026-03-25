

## Plano: Tela dedicada de login para Tablets (Clientes)

### Situação atual
A página `/cliente` usa o mesmo sistema de login operacional (`loginByPin` com Código da Loja + PIN) que garçom, caixa, etc. O módulo "cliente" do tablet precisa de um login próprio e separado.

### O que muda

**1. Adicionar módulo "cliente" ao StorePinsManager**
- Incluir `{ value: "cliente", label: "Tablet Cliente" }` na lista `MODULES` em `StorePinsManager.tsx`
- Assim o admin pode criar PINs específicos para tablets de cliente

**2. Atualizar a tela de login em ClientePage**
- Manter os dois campos: **Código da Loja** (slug) + **PIN**
- Alterar a lógica de `handleLogin` para usar `loginByPin` mas filtrar apenas PINs do módulo `cliente`
- Na prática: continua usando `loginByPin` (que já resolve o módulo automaticamente). Se o PIN cadastrado for do módulo "cliente", o tablet é liberado. Se for de outro módulo (garçom, caixa), exibe erro "PIN não autorizado para tablet"
- Ajustar o texto da UI para deixar claro que é um PIN de tablet

**3. Validação no ClientePage**
- Após `loginByPin` retornar sucesso, verificar se `result.module === "cliente"`
- Se não for, mostrar erro: "Este PIN não é de um tablet. Cadastre um PIN de Tablet Cliente no painel."

### Detalhes técnicos

- **Sem alteração no banco**: a tabela `module_pins` já suporta qualquer valor de `module`. Basta cadastrar PINs com `module = "cliente"`
- **Sem nova RPC**: o `loginByPin` do AuthContext já busca todos os PINs da loja e retorna o módulo encontrado. Apenas validamos no frontend que o módulo é "cliente"
- **Arquivos alterados**:
  - `src/components/StorePinsManager.tsx` — adicionar "cliente" / "Tablet Cliente" ao array MODULES
  - `src/pages/ClientePage.tsx` — adicionar verificação `result.module === "cliente"` no handleLogin, com mensagem de erro apropriada

