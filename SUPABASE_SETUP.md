# Configuração do Supabase para Arthur Lira Leilões

## Resumo da Implementação

Foi implementada uma estrutura completa de banco de dados no Supabase para o aplicativo Arthur Lira Leilões, com sincronização em tempo real e migração automática dos dados locais.

## Estrutura do Banco de Dados

### Tabelas Principais

1. **users** - Usuários do sistema
2. **auctions** - Leilões
3. **bidders** - Arrematantes 
4. **lots** - Lotes
5. **merchandise** - Mercadorias
6. **invoices** - Faturas
7. **documents** - Documentos

### Funcionalidades Implementadas

✅ **Estrutura Completa do Banco**
- Todas as tabelas com relacionamentos corretos
- Políticas RLS (Row Level Security) configuradas
- Triggers automáticos para updated_at
- Índices otimizados para performance

✅ **Sincronização em Tempo Real**
- Todas as tabelas habilitadas para realtime
- Hook personalizado para sincronização automática
- Invalidação inteligente de cache

✅ **Funções de Negócio**
- Atualização automática de status de leilões
- Cálculo automático de status de faturas
- Views para estatísticas do dashboard

✅ **Sistema de Migração**
- Migração automática do localStorage para Supabase
- Interface gráfica para gerenciar a migração
- Validação de dados durante a migração

## Instalação das Dependências

Execute o comando abaixo para instalar as dependências necessárias:

```bash
npm install @supabase/supabase-js
```

## Arquivos Criados/Modificados

### Novos Arquivos:
- `src/lib/supabase-client.ts` - Cliente Supabase configurado
- `src/hooks/use-supabase-auctions.ts` - Hook para leilões no Supabase
- `src/hooks/use-supabase-bidders.ts` - Hook para arrematantes no Supabase
- `src/hooks/use-realtime-sync.ts` - Hook para sincronização em tempo real
- `src/hooks/use-dashboard-stats.ts` - Hook para estatísticas do dashboard
- `src/lib/migrate-to-supabase.ts` - Utilitários de migração
- `src/components/MigrationManager.tsx` - Interface para migração

### Arquivos Modificados:
- `src/App.tsx` - Integração da sincronização em tempo real
- `src/pages/Dashboard.tsx` - Uso das estatísticas do Supabase
- `src/lib/supabase.ts` - Re-export do cliente principal

## Como Usar

### 1. Migração dos Dados

1. Acesse a rota `/migracao` no aplicativo
2. Clique em "Verificar" para testar a conexão com Supabase
3. Clique em "Migrar Dados" para transferir os dados do localStorage
4. Aguarde a conclusão da migração

### 2. Sincronização em Tempo Real

A sincronização acontece automaticamente:
- Qualquer alteração feita por um usuário é refletida para todos os outros
- As queries são invalidadas automaticamente quando há mudanças
- O dashboard é atualizado em tempo real

### 3. Usando os Novos Hooks

```typescript
// Para leilões
import { useSupabaseAuctions } from '@/hooks/use-supabase-auctions';

function MeuComponente() {
  const { auctions, createAuction, updateAuction } = useSupabaseAuctions();
  // ...
}

// Para estatísticas
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

function Dashboard() {
  const { stats } = useDashboardStats();
  // stats.leiloes_agendados, stats.total_arrematantes, etc.
}
```

## Estrutura de Dados

### Auction (Leilão)
```typescript
interface Auction {
  id: string;
  nome: string;
  identificacao?: string;
  local: "presencial" | "online" | "hibrido";
  endereco?: string;
  dataInicio: string;
  dataAndamento?: string;
  dataEncerramento?: string;
  prazoFinalPagamento: string;
  status: "agendado" | "em_andamento" | "finalizado";
  custos?: string;
  custosNumerico?: number;
  historicoNotas?: string[];
  arquivado?: boolean;
}
```

### Bidder (Arrematante)
```typescript
interface Bidder {
  id: string;
  auction_id: string;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  valor_pagar_texto?: string;
  valor_pagar_numerico?: number;
  data_pagamento: string;
  pago: boolean;
  data_pagamento_realizado?: string;
  observacoes?: string;
}
```

## Funcionalidades Automáticas

### Status Automático de Leilões
- **Agendado**: Antes da data de início
- **Em Andamento**: Entre data de início e encerramento
- **Finalizado**: Após data de encerramento

### Status Automático de Faturas
- **Em Aberto**: Antes do vencimento e não pago
- **Atrasado**: Após vencimento e não pago
- **Pago**: Quando data_pagamento é preenchida

### Estatísticas em Tempo Real
- Total de leilões por status
- Arrematantes pagos/pendentes/atrasados
- Valores totais a receber
- Faturas em aberto/atrasadas

## Próximos Passos

1. **Testar a Migração**: Execute a migração dos dados existentes
2. **Verificar Sincronização**: Teste com múltiplos usuários/abas
3. **Implementar Storage**: Para upload de documentos/imagens
4. **Relatórios Avançados**: Usar as views criadas para relatórios
5. **Notificações**: Implementar notificações para vencimentos

## Troubleshooting

### Erro de Conexão
- Verifique se as credenciais do Supabase estão corretas
- Confirme que o projeto está ativo no Supabase

### Dados Não Sincronizam
- Verifique se as políticas RLS estão configuradas
- Confirme que o realtime está habilitado para as tabelas

### Migração Falha
- Verifique se há dados duplicados
- Confirme que as chaves estrangeiras estão corretas
- Use o componente MigrationManager para debug

## Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador para erros JavaScript
2. Logs do Supabase no dashboard
3. Políticas RLS configuradas corretamente
