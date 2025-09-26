# 🚀 Guia Completo para Hospedar seu App no Hostinger

## 📋 Pré-requisitos
- ✅ Build do projeto já criado (pasta `dist/`)
- ✅ Conta no Hostinger
- ✅ Projeto configurado com Supabase

## 🎯 Passo a Passo Completo

### **ETAPA 1: Preparar os Arquivos**

1. **Localizar a pasta `dist/`**
   - No seu projeto, você encontrará a pasta `dist/` que foi criada após o build
   - Esta pasta contém todos os arquivos otimizados para produção

2. **Criar arquivo ZIP**
   - Abra a pasta `dist/`
   - Selecione TODOS os arquivos e pastas dentro de `dist/`
   - Clique com o botão direito → "Enviar para" → "Pasta compactada (zipada)"
   - Nomeie o arquivo como `auction-app.zip`

### **ETAPA 2: Configurar no Hostinger**

1. **Acessar o Painel do Hostinger**
   - Acesse: https://hostinger.com.br
   - Faça login na sua conta
   - Vá para o painel de controle (hPanel)

2. **Escolher o Plano de Hospedagem**
   - **Recomendado**: Plano Premium ou Business
   - **Mínimo**: Plano Single (pode ter limitações)

3. **Configurar Domínio**
   - Se já tem domínio: conecte-o nas configurações
   - Se não tem: use o subdomínio gratuito temporário

### **ETAPA 3: Upload dos Arquivos**

1. **Acessar o Gerenciador de Arquivos**
   - No hPanel, clique em "Gerenciador de Arquivos"
   - Navegue até a pasta `public_html`

2. **Limpar pasta public_html**
   - Delete todos os arquivos padrão (index.html, etc.)
   - Mantenha apenas as pastas necessárias (.htaccess se existir)

3. **Fazer Upload**
   - Clique em "Upload" no gerenciador
   - Selecione o arquivo `auction-app.zip`
   - Aguarde o upload completar
   - Clique com botão direito no arquivo ZIP → "Extrair"
   - Delete o arquivo ZIP após extrair

### **ETAPA 4: Configurar Redirecionamento (SPA)**

1. **Criar arquivo .htaccess**
   - No gerenciador de arquivos, clique em "Novo Arquivo"
   - Nome: `.htaccess`
   - Adicione o seguinte conteúdo:

```apache
RewriteEngine On
RewriteBase /

# Redirecionar todas as rotas para index.html (SPA)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]

# Cache para arquivos estáticos
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Compressão GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

### **ETAPA 5: Configurar SSL (HTTPS)**

1. **Ativar SSL Gratuito**
   - No hPanel, vá para "SSL"
   - Selecione seu domínio
   - Clique em "Instalar SSL Gratuito"
   - Aguarde a ativação (pode levar até 24h)

2. **Forçar HTTPS**
   - Ative a opção "Forçar HTTPS"
   - Isso redirecionará automaticamente HTTP para HTTPS

### **ETAPA 6: Testar o Aplicativo**

1. **Acessar o Site**
   - Abra seu domínio no navegador
   - Teste todas as funcionalidades principais
   - Verifique se as rotas estão funcionando

2. **Verificar Conexão com Supabase**
   - Faça login no sistema
   - Teste criação/edição de leilões
   - Verifique se os dados estão sendo salvos

### **ETAPA 7: Configurações Avançadas (Opcional)**

1. **Configurar Cache**
   - No hPanel, vá para "Cache"
   - Ative o cache do navegador
   - Configure TTL para arquivos estáticos

2. **CDN (Content Delivery Network)**
   - Ative o CDN gratuito do Hostinger
   - Isso melhorará a velocidade global

3. **Backup Automático**
   - Configure backups automáticos
   - Recomendado: backup semanal

## 🔧 Solução de Problemas Comuns

### **Problema: Página em branco**
- **Causa**: Arquivos não extraídos corretamente
- **Solução**: Verifique se todos os arquivos estão na pasta `public_html`

### **Problema: Erro 404 nas rotas**
- **Causa**: Arquivo .htaccess não configurado
- **Solução**: Crie o arquivo .htaccess com as regras acima

### **Problema: Erro de conexão com Supabase**
- **Causa**: Variáveis de ambiente não configuradas
- **Solução**: As chaves já estão no código, deve funcionar automaticamente

### **Problema: Site lento**
- **Causa**: Arquivos não comprimidos
- **Solução**: Ative compressão GZIP no .htaccess

## 📱 Configurações Mobile

O app já está otimizado para mobile, mas verifique:
- Teste em diferentes dispositivos
- Verifique se o design responsivo está funcionando
- Teste as funcionalidades touch

## 🔐 Segurança

1. **Mantenha o Supabase atualizado**
2. **Use HTTPS sempre**
3. **Configure CSP (Content Security Policy)** se necessário
4. **Monitore logs de acesso**

## 📊 Monitoramento

1. **Google Analytics** (opcional)
2. **Logs do servidor** no hPanel
3. **Monitoramento de uptime**
4. **Performance do Supabase**

## 💰 Custos Estimados

- **Plano Single**: ~R$ 12/mês
- **Plano Premium**: ~R$ 25/mês (recomendado)
- **Plano Business**: ~R$ 45/mês (para alta demanda)

## 🎉 Próximos Passos

Após a hospedagem:
1. Configure um domínio personalizado
2. Implemente analytics
3. Configure backups regulares
4. Monitore performance
5. Planeje atualizações futuras

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no hPanel
2. Teste localmente primeiro
3. Contate o suporte do Hostinger se necessário
4. Documente erros para futuras referências

**🚀 Seu app estará online em poucos minutos seguindo este guia!**
