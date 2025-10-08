# 🚨 Correção: Domínio em Produção

## ⚠️ Problema Identificado

O site **https://www.grupoliraleiloes.com** ainda está com código antigo porque:

1. ✅ Deploy no Vercel funcionou corretamente
2. ❌ Domínio `www.grupoliraleiloes.com` **NÃO** está apontando para o Vercel
3. ❌ Está em outro servidor (provavelmente Hostinger)

---

## 🎯 Solução: Atualizar Arquivos no Servidor Atual

Como o domínio está em outro servidor, você precisa fazer **upload manual** dos arquivos atualizados.

---

## 📋 Passo a Passo - Upload via Hostinger/cPanel

### **Passo 1: Acessar o Painel do Servidor**

1. Acesse o painel onde o site está hospedado:
   - **Hostinger:** https://hpanel.hostinger.com
   - **cPanel:** geralmente `seudominio.com/cpanel`
   - Ou o painel que você usa

2. Faça login com suas credenciais

---

### **Passo 2: Abrir o Gerenciador de Arquivos**

1. Procure por **"File Manager"** ou **"Gerenciador de Arquivos"**

2. Clique para abrir

3. Navegue até a pasta do site:
   - Geralmente: `public_html/` 
   - Ou: `www/`
   - Ou: `htdocs/`

---

### **Passo 3: Fazer Backup dos Arquivos Atuais**

⚠️ **IMPORTANTE: Faça backup antes de deletar!**

1. Selecione todos os arquivos da pasta atual

2. Clique em **"Compress"** ou **"Comprimir"**

3. Salve como: `backup-antigo-08-10-2025.zip`

4. Faça download do backup para seu computador

---

### **Passo 4: Deletar Arquivos Antigos**

1. Selecione **TODOS** os arquivos da pasta `public_html/`

2. Clique em **"Delete"** ou **"Excluir"**

3. Confirme a exclusão

⚠️ **NÃO DELETE:**
- `.htaccess` (se houver e você souber que é importante)
- Arquivos de configuração específicos do servidor

---

### **Passo 5: Upload dos Novos Arquivos**

#### **Opção A: Upload via Painel Web**

1. No File Manager, clique em **"Upload"**

2. No seu computador, vá até:
   ```
   C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\
   ```

3. Selecione **TODOS** os arquivos e pastas dentro de `dist/`

4. Faça upload de tudo

5. Aguarde o upload completar

#### **Opção B: Upload via FTP (Mais Rápido)**

**Instalar FileZilla (se não tiver):**
- Download: https://filezilla-project.org/download.php?type=client

**Conectar via FTP:**

1. Abra o FileZilla

2. Pegue as credenciais FTP no painel do Hostinger:
   - Host: geralmente `ftp.seudominio.com` ou IP
   - Usuário: seu usuário FTP
   - Senha: sua senha FTP
   - Porta: 21 (FTP) ou 22 (SFTP)

3. Clique em **"Conexão Rápida"**

4. No lado esquerdo (seu computador), navegue até:
   ```
   C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\
   ```

5. No lado direito (servidor), navegue até `public_html/`

6. Selecione **TODOS** os arquivos de `dist/`

7. Arraste para o lado direito (servidor)

8. Aguarde o upload completar

---

### **Passo 6: Verificar Estrutura de Arquivos**

Após o upload, a pasta `public_html/` deve conter:

```
public_html/
├── index.html
├── arthur-lira-logo.png
├── favicon.ico
├── favicon.png
├── favicon-large.png
├── klionx-logo.png
├── placeholder.svg
├── robots.txt
└── assets/
    ├── index-rm07kngz.js
    ├── index-uGUegNU_.css
    ├── html2canvas-Dlpd5tET.js
    ├── purify.es-BFmuJLeH.js
    ├── index.es-BUs35ZwH.js
    └── html2pdf-CR096SgA.js (se houver)
```

---

### **Passo 7: Limpar Cache**

1. **No servidor (se houver opção):**
   - Procure por "Clear Cache" ou "Limpar Cache"
   - Clique para limpar

2. **No navegador:**
   - Pressione `Ctrl + Shift + Del`
   - Marque "Cache" e "Cookies"
   - Clique em "Limpar dados"

3. **Recarregue o site:**
   - Pressione `Ctrl + F5` para forçar reload

---

### **Passo 8: Testar o Login**

1. Acesse: **https://www.grupoliraleiloes.com/login**

2. Faça login com:
   - **Email:** `igor.elion@arthurlira.com`
   - **Senha:** `@Elionigorrr2010`

3. ✅ **Deve funcionar agora!**

---

## 🔄 Alternativa: Migrar Domínio para Vercel (Recomendado)

Se você preferir não fazer upload manual toda vez, pode apontar o domínio para o Vercel:

### **Vantagens:**
- ✅ Deploy automático quando você atualiza o código
- ✅ CDN global (site mais rápido)
- ✅ HTTPS automático
- ✅ Sem necessidade de upload manual

### **Como Fazer:**

#### **1. Adicionar Domínio no Vercel**

1. Acesse: https://vercel.com/dashboard

2. Clique no projeto **"auction-usher"**

3. Vá em **"Settings"** → **"Domains"**

4. Clique em **"Add"**

5. Digite: `www.grupoliraleiloes.com`

6. Clique em **"Add"**

7. O Vercel vai mostrar os registros DNS necessários:
   ```
   Tipo: CNAME
   Nome: www
   Valor: cname.vercel-dns.com
   ```

#### **2. Atualizar DNS no Registrador**

1. Acesse o painel onde você **comprou o domínio**:
   - Registro.br (se for .com.br)
   - GoDaddy
   - Namecheap
   - Ou outro registrador

2. Vá em **"DNS Management"** ou **"Gerenciar DNS"**

3. Encontre o registro CNAME para `www`

4. Edite ou adicione:
   - **Tipo:** CNAME
   - **Host:** www
   - **Aponta para:** `cname.vercel-dns.com`
   - **TTL:** 3600 (ou deixe automático)

5. Salve as alterações

6. Aguarde a propagação (pode levar de minutos a 24 horas)

---

## 📊 Comparação: Upload Manual vs Vercel

| Aspecto | Upload Manual | Apontar para Vercel |
|---------|---------------|---------------------|
| Configuração inicial | Mais fácil | Requer configurar DNS |
| Atualizações | Upload manual toda vez | Automático |
| Velocidade | Depende do servidor | CDN global (mais rápido) |
| HTTPS | Depende do servidor | Automático |
| Custo | Depende do host | Grátis no plano free |

---

## 🆘 Precisa de Ajuda?

Se tiver dificuldade:

1. Me informe qual painel você usa (Hostinger, cPanel, outro)
2. Tire screenshots das telas
3. Me envie para ajudar

---

## 📍 Localizações Importantes

**Pasta com arquivos atualizados no seu PC:**
```
C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\
```

**Pasta no servidor (geralmente):**
```
public_html/
```

---

**💡 Recomendação:** Configure o domínio no Vercel para ter deploy automático e evitar uploads manuais no futuro!

