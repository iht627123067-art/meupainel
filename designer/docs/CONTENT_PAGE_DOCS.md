# Página de Conteúdo - Implementação Completa

## 📍 URL
`http://localhost:8080/content`

## ✨ Funcionalidades Implementadas

### 1. **Visualização em Split-View**
- **Painel Esquerdo**: Lista de artigos extraídos com:
  - Título do artigo
  - Publisher (fonte)
  - Contagem de palavras
  - Badge de qualidade (Excelente, Bom, Regular, Baixo)
  - Badge de status atual
  
- **Painel Direito**: Visualizador de conteúdo com:
  - Título completo
  - Metadados (data de extração, palavras, qualidade)
  - Keywords/Tags do artigo
  - Conteúdo em Markdown renderizado com `react-markdown`
  - Link para o artigo original

### 2. **Ações Disponíveis**
- ✅ **Aprovar**: Move o item para o status "classified" (pronto para classificação)
- ❌ **Rejeitar**: Marca o item como "rejected"
- 🔄 **Re-extrair**: Chama novamente a Edge Function `extract-content` para tentar extrair o conteúdo novamente

### 3. **Integração com Supabase**
- Busca dados da tabela `extracted_content` com JOIN em `alerts`
- Atualiza status dos alertas via API do Supabase
- Chama Edge Functions para re-extração

### 4. **UI/UX**
- Design responsivo com Tailwind CSS
- Cards interativos com hover states
- Badges coloridos para indicar qualidade e status
- Scroll independente em cada painel
- Loading states durante operações
- Toast notifications para feedback ao usuário

## 🎨 Componentes Utilizados
- `DashboardLayout`: Layout padrão com sidebar
- `Card`, `CardHeader`, `CardContent`: Estrutura dos painéis
- `ScrollArea`: Áreas de scroll otimizadas
- `Badge`: Indicadores visuais
- `Button`: Ações
- `ReactMarkdown`: Renderização do conteúdo

## 📦 Dependências Adicionadas
```bash
npm install react-markdown @tailwindcss/typography
```

## 🔗 Navegação
O link "Conteúdos" já está disponível no Sidebar (ícone FileText).

## 🎯 Próximos Passos Sugeridos
1. Adicionar filtros por qualidade/status
2. Implementar busca de artigos
3. Adicionar paginação para grandes volumes
4. Melhorar visualização de imagens no markdown
5. Adicionar preview de metadados de classificação (quando disponível)
