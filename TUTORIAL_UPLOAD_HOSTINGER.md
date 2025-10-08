# 📤 Tutorial: Upload para Hostinger - Passo a Passo com Imagens

## 🎯 Objetivo

Atualizar o site **www.grupoliraleiloes.com** com o código mais recente que corrige o problema de login.

---

## ✅ Confirmação

O domínio está hospedado em **Hostinger** (IPs: 64.29.17.1 e 216.198.79.1).

---

## 📋 Passo a Passo Completo

### **Passo 1: Acessar o Painel do Hostinger**

1. Abra seu navegador

2. Acesse: **https://hpanel.hostinger.com**

3. Faça login com:
   - Email da conta Hostinger
   - Senha da conta Hostinger

4. Após login, você verá o painel principal

---

### **Passo 2: Encontrar o Site**

1. No painel principal, procure por **"grupoliraleiloes.com"**

2. Clique no site para gerenciá-lo

3. Ou procure por **"Websites"** no menu lateral

---

### **Passo 3: Abrir o File Manager (Gerenciador de Arquivos)**

1. No painel do site, procure por:
   - **"File Manager"**
   - Ou **"Gerenciador de Arquivos"**
   - Ou ícone de pasta 📁

2. Clique para abrir

3. Uma nova aba vai abrir com o gerenciador de arquivos

---

### **Passo 4: Navegar até a Pasta Correta**

1. No File Manager, você verá várias pastas

2. Procure e clique na pasta:
   - **`public_html`** (mais comum)
   - Ou **`domains/grupoliraleiloes.com/public_html`**

3. Esta é a pasta onde está o site atual

---

### **Passo 5: Fazer Backup (IMPORTANTE!)**

⚠️ **NUNCA pule este passo!**

#### **Método 1: Comprimir e Baixar**

1. No File Manager, **selecione TODOS os arquivos** da pasta `public_html`
   - Clique no primeiro arquivo
   - Pressione `Ctrl + A` para selecionar todos

2. Clique com botão direito (ou procure botão no topo)

3. Clique em **"Compress"** ou **"Comprimir"**

4. Nome sugerido: `backup-site-antigo-08-10-2025.zip`

5. Clique em **"Compress"** para criar o arquivo

6. Após criar, clique com botão direito no arquivo `.zip`

7. Clique em **"Download"** ou **"Baixar"**

8. Salve em um local seguro no seu computador

9. ✅ **Backup concluído!**

---

### **Passo 6: Deletar Arquivos Antigos**

1. Ainda no File Manager, na pasta `public_html`

2. **Selecione TODOS os arquivos** (menos o backup.zip se ainda estiver lá)
   - Pressione `Ctrl + A`

3. Clique com botão direito

4. Clique em **"Delete"** ou **"Excluir"**

5. Confirme a exclusão

6. A pasta deve ficar **vazia**

---

### **Passo 7: Fazer Upload dos Novos Arquivos**

#### **Opção A: Upload via File Manager (Mais Fácil)**

1. No File Manager, ainda na pasta `public_html` (agora vazia)

2. Procure pelo botão **"Upload"** ou **"Upload Files"** (geralmente no topo)

3. Clique em **"Upload"**

4. Uma janela vai abrir

5. No seu computador, navegue até:
   ```
   C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\
   ```

6. **IMPORTANTE:** Você precisa fazer upload do **CONTEÚDO** da pasta `dist/`, não da pasta `dist/` em si

7. Abra a pasta `dist/`

8. Selecione **TODOS os arquivos e pastas** dentro de `dist/`:
   - `index.html`
   - Pasta `assets/`
   - Todas as imagens (*.png)
   - `robots.txt`
   - Etc.

9. Arraste todos para a janela de upload, ou clique em **"Select Files"**

10. Aguarde o upload completar (pode levar alguns minutos)

11. ✅ **Upload concluído!**

#### **Opção B: Upload via FTP (Mais Rápido para Muitos Arquivos)**

**Obter Credenciais FTP:**

1. No painel do Hostinger, procure por:
   - **"FTP Accounts"** ou **"Contas FTP"**

2. Você vai ver:
   - **Hostname:** algo como `ftp.grupoliraleiloes.com`
   - **Username:** seu usuário FTP
   - **Password:** sua senha FTP (ou crie uma nova)
   - **Port:** 21 (FTP) ou 22 (SFTP)

**Usar FileZilla:**

1. Baixe e instale FileZilla (se não tiver):
   - https://filezilla-project.org/download.php?type=client

2. Abra o FileZilla

3. No topo, preencha:
   - **Host:** `ftp.grupoliraleiloes.com` (ou IP fornecido)
   - **Username:** seu usuário FTP
   - **Password:** sua senha FTP
   - **Port:** 21

4. Clique em **"Quickconnect"** ou **"Conexão Rápida"**

5. Aguarde conectar

6. **Lado esquerdo** (seu computador):
   - Navegue até: `C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\`

7. **Lado direito** (servidor):
   - Navegue até: `public_html/`

8. No lado esquerdo, **DENTRO da pasta `dist/`**:
   - Selecione **TODOS os arquivos e pastas** (Ctrl + A)

9. Arraste todos para o lado direito

10. Aguarde o upload completar

11. ✅ **Upload concluído!**

---

### **Passo 8: Verificar Estrutura de Arquivos**

Após o upload, a pasta `public_html/` deve ter esta estrutura:

```
public_html/
├── index.html              ← Arquivo principal
├── arthur-lira-logo.png
├── favicon.ico
├── favicon.png
├── favicon-large.png
├── placeholder.svg
├── robots.txt
└── assets/                 ← Pasta com JS e CSS
    ├── index-rm07kngz.js
    ├── index-uGUegNU_.css
    ├── html2canvas-Dlpd5tET.js
    ├── purify.es-BFmuJLeH.js
    └── index.es-BUs35ZwH.js
```

⚠️ **IMPORTANTE:** O arquivo `index.html` deve estar **DIRETAMENTE** na pasta `public_html/`, não dentro de uma subpasta!

**❌ ERRADO:**
```
public_html/
└── dist/
    └── index.html  ← ERRADO!
```

**✅ CORRETO:**
```
public_html/
├── index.html  ← CORRETO!
└── assets/
```

---

### **Passo 9: Limpar Cache**

#### **No Hostinger (se houver opção):**

1. No painel do Hostinger, procure por:
   - **"Cache"**
   - **"Clear Cache"**
   - **"Otimização"**

2. Se encontrar, clique em **"Clear Cache"** ou **"Limpar Cache"**

#### **No seu Navegador:**

1. Pressione `Ctrl + Shift + Delete`

2. Marque:
   - ✅ Cookies
   - ✅ Cache/Cached images and files

3. Período: **"All time"** ou **"Tudo"**

4. Clique em **"Clear data"** ou **"Limpar dados"**

---

### **Passo 10: Testar o Site**

1. Abra o navegador (ou uma aba anônima/privada)

2. Acesse: **https://www.grupoliraleiloes.com**

3. Se ainda mostrar página antiga:
   - Pressione `Ctrl + F5` para forçar recarregamento

4. Vá para: **https://www.grupoliraleiloes.com/login**

5. Faça login com:
   - **Email:** `igor.elion@arthurlira.com`
   - **Senha:** `@Elionigorrr2010`

6. ✅ **DEVE FUNCIONAR AGORA!**

---

## 🆘 Resolução de Problemas

### **Problema 1: Arquivos na pasta errada**

**Sintoma:** Site mostra "Index of /" ou lista de arquivos

**Solução:** 
- O `index.html` não está na pasta correta
- Mova todos os arquivos para `public_html/` (não dentro de subpasta)

---

### **Problema 2: Site ainda mostra versão antiga**

**Sintoma:** Login ainda não funciona

**Soluções:**
1. Limpe o cache do navegador novamente
2. Teste em aba anônima/privada
3. Aguarde 5-10 minutos (propagação de cache do servidor)
4. Verifique se os arquivos foram realmente atualizados no servidor

---

### **Problema 3: Erro 500 ou site não carrega**

**Sintoma:** Página em branco ou erro interno

**Possíveis causas:**
- Arquivo `.htaccess` problemático
- Permissões de arquivo incorretas

**Solução:**
1. No File Manager, verifique se há arquivo `.htaccess`
2. Se houver e você não sabe o que é, renomeie para `.htaccess.bak`
3. Recarregue o site
4. Se funcionar, o problema era o .htaccess

---

### **Problema 4: CSS/JS não carrega (site sem estilo)**

**Sintoma:** Site aparece sem cores/estilo, só texto

**Causa:** Pasta `assets/` não foi carregada ou está no lugar errado

**Solução:**
1. Verifique se a pasta `assets/` está em `public_html/assets/`
2. Verifique se os arquivos JS e CSS estão dentro de `assets/`
3. Se necessário, faça upload da pasta `assets/` novamente

---

## 📁 Localização dos Arquivos

### **No seu computador:**
```
C:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher\dist\
```

### **No servidor Hostinger:**
```
public_html/
```

---

## ✅ Checklist de Verificação

Antes de testar, confirme:

- [ ] Backup do site antigo foi feito
- [ ] Arquivos antigos foram deletados
- [ ] Novos arquivos foram carregados
- [ ] `index.html` está em `public_html/` (não em subpasta)
- [ ] Pasta `assets/` está em `public_html/assets/`
- [ ] Cache do navegador foi limpo
- [ ] Site foi recarregado com `Ctrl + F5`

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:

1. Tire screenshots das telas
2. Me envie descrevendo o problema
3. Posso te ajudar remotamente se necessário

---

## ⏱️ Tempo Estimado

- **Upload via File Manager:** 10-15 minutos
- **Upload via FTP:** 5-10 minutos
- **Propagação/Cache:** 0-10 minutos

**Total:** 15-35 minutos

---

**🎯 Após seguir este tutorial, o login no site deve funcionar perfeitamente!** ✅

