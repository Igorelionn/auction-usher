# 📤 Como Fazer Upload das Logos para os Emails

## ⚠️ IMPORTANTE - 2 MINUTOS

Para que as logos apareçam nos emails, faça upload delas para o Supabase Storage seguindo estes passos rápidos:

---

## 🚀 Passo a Passo RÁPIDO (2 minutos)

### 1️⃣ Acesse o Supabase Storage
**Link direto:**
```
https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd/storage/buckets
```

### 2️⃣ Crie o Bucket "documents"

1. Clique em **"New bucket"** (canto superior direito)
2. Nome do bucket: `documents`
3. ✅ **IMPORTANTE:** Marque **"Public bucket"**
4. Clique em **"Create bucket"**

### 3️⃣ Faça Upload das Logos

1. **Clique** no bucket `documents` que você acabou de criar
2. **Clique** em **"Upload file"** (ou arraste os arquivos)
3. **Selecione AMBOS os arquivos:**
   - `arthur-lira-logo.png` (da pasta `public`)
   - `Elionsoftwares.png` (da pasta `public`)
4. **Clique** em **"Upload"**
5. **Aguarde** o upload completar (2 segundos)

### 4️⃣ Verifique se Funcionou

**Teste as URLs no navegador:**
```
https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png

https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/Elionsoftwares.png
```

Se as imagens aparecerem ✅ está pronto!

### 5️⃣ Teste um Email

1. Vá em **Configurações → Email**
2. Envie um email de teste
3. **Veja as logos no final** do email! 🎉

---

## 📂 Localização dos Arquivos

Os arquivos estão na pasta `public` do projeto:
```
C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\public\arthur-lira-logo.png
C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\public\Elionsoftwares.png
```

**Tamanhos:**
- arthur-lira-logo.png: ~63KB
- Elionsoftwares.png: Varia conforme imagem

---

## 🎯 ATALHO RÁPIDO

**Caminho mais rápido:**

1. Abra: https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd/storage
2. New bucket → `documents` → Public ✅ → Create
3. Clique em `documents` → Upload → Selecione as 2 logos
4. Pronto! ✅

**Tempo total:** ~2 minutos

---

## ✅ Verificação Final

Depois do upload, os emails terão este rodapé:

```
Atenciosamente,
Arthur Lira Leilões

┌────────────┐    ┌────────────┐
│            │    │            │
│ [Logo Lira]│    │[Logo Elion] │
│            │    │            │
└────────────┘    └────────────┘

© 2025 Arthur Lira Leilões
Desenvolvido por Elion Softwares
```

---

## 🐛 Se as Logos Não Aparecerem

### Problema 1: Bucket não é público
**Solução:**
1. Vá em Storage → documents
2. Settings (engrenagem)
3. ✅ Marque "Public bucket"
4. Save

### Problema 2: Nome do arquivo errado
**Certifique-se:**
- Nome exato: `arthur-lira-logo.png` (minúsculas, com hífen)
- Nome exato: `Elionsoftwares.png` (com E maiúsculo, sem hífens)

### Problema 3: URL incorreta
**Teste a URL** diretamente no navegador:
- Se abrir a imagem ✅ está certo
- Se der 404 ❌ verifique o nome/bucket

---

## 📧 Alternativa Temporária

Se não quiser fazer upload agora, as logos simplesmente não aparecerão nos emails (o resto funciona normalmente).

Você pode fazer o upload depois e os próximos emails já terão as logos.

---

**🎯 Upload das Logos: GUIA COMPLETO!**

Siga os 5 passos acima e suas logos estarão nos emails! 🚀

---

## 🔄 Alternativa: URLs Relativas (Produção)

Se preferir, você pode trocar as URLs nos templates para URLs relativas que apontam para seu domínio em produção.

**Edite:** `src/lib/email-templates.ts`

**Troque:**
```html
<img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" ... />
```

**Por:**
```html
<img src="https://seudominio.com.br/arthur-lira-logo.png" ... />
```

---

## ✅ Verificar se Funcionou

1. Envie um email de teste
2. Abra o email recebido
3. Role até o final
4. As duas logos devem aparecer

Se não aparecerem:
- Verifique se as URLs estão corretas
- Confirme que o bucket é público
- Teste as URLs no navegador

---

**Pronto! Logos configuradas nos emails!** 🎉

