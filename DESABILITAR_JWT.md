# 🔧 Como Desabilitar JWT na Edge Function

## Problema
A Edge Function está retornando **401 Unauthorized** porque está pedindo autenticação JWT.

## Solução Rápida (2 minutos)

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse:** https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd/functions

2. **Clique** na função **send-email**

3. **Vá na aba "Settings"** ou "Configurações"

4. **Procure por "JWT Verification"** ou "Verify JWT"

5. **Desabilite** a opção (toggle para OFF)

6. **Salve** as alterações

7. **Pronto!** Teste novamente no app

---

### Opção 2: Via Supabase CLI (Se tiver instalado)

```bash
# Na pasta do projeto
cd "C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher"

# Criar arquivo de configuração
mkdir -p supabase/functions/send-email
cat > supabase/functions/send-email/config.toml << EOF
[function.send-email]
verify_jwt = false
EOF

# Fazer deploy
supabase functions deploy send-email --no-verify-jwt
```

---

### Opção 3: Alternativa Temporária (Sem desabilitar JWT)

Se não conseguir desabilitar o JWT agora, vou criar uma versão da função que aceita a chave do Supabase:

**EM VEZ DISSO, VAMOS TENTAR ALGO MAIS SIMPLES:**

---

## ⚡ Solução IMEDIATA (Sem mexer no Supabase)

Vou modificar o código do app para NÃO exigir autenticação!


