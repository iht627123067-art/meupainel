# Configuração e Deploy na Vercel

Este documento detalha o processo de configuração e deploy da aplicação `designer` (Meupainel) na plataforma Vercel.

## Pré-requisitos

*   Node.js instalado.
*   Conta na Vercel (vercel.com).
*   CLI da Vercel (opcional, mas recomendado): `npm i -g vercel`.
    *   Caso não tenha a CLI global, utilize `npx vercel`.

## Passo a Passo: Configuração Inicial e Vinculação

O processo abaixo descreve como vincular o diretório local ao projeto existente na Vercel.

1.  **Navegue até o diretório do projeto:**
    ```bash
    cd designer
    ```

2.  **Inicie o processo de deploy:**
    Execute o comando:
    ```bash
    npx vercel
    ```

3.  **Siga as instruções interativas:**
    O terminal solicitará algumas confirmações. Utilize as setas e Enter para selecionar.

    *   **Set up and deploy “path/to/designer”?**
        *   Resposta: `Y` (Yes)
    
    *   **Which scope should contain your project?**
        *   Selecione sua conta ou time. Exemplo: `iht's projects`.

    *   **Link to existing project?**
        *   Resposta: `Y` (Yes) - **Importante:** Como o projeto já existe no painel da Vercel (`meupainel`), devemos vincular a ele em vez de criar um novo.

    *   **Which existing project do you want to link?**
        *   Selecione: `meupainel`

    *   **Would you like to pull environment variables now?**
        *   Resposta Recomendada: `N` (se você já tem o `.env` configurado localmente ou prefere gerenciar manualmente).
        *   Use `Y` se quiser sincronizar as variáveis da nuvem para seu ambiente local.

    O Vercel CLI irá criar automaticamente uma pasta `.vercel` localmente (que deve ser ignorada no `.gitignore`) contendo as configurações de projeto (`project.json`).

## Realizando Deploys

Após a configuração inicial, você pode realizar deploys usando os seguintes comandos:

### Deploy de Preview (Desenvolvimento)
Envia suas alterações para uma URL de preview temporária. Ideal para testes antes da produção.

```bash
npx vercel
```

### Deploy de Produção
Envia suas alterações para o domínio principal (ex: `meupainel-lilac.vercel.app`).

```bash
npx vercel --prod
```

## Arquivos Relacionados

*   **.vercel/**: Diretório gerado automaticamente contendo IDs do projeto e organização. Não deve ser comitado.
*   **.gitignore**: Certifique-se de que `.vercel` está listado aqui.

## Solução de Problemas Comuns

*   **Erro de Permissão:** Verifique se você está logado na conta correta usando `npx vercel login`.
*   **Projeto não encontrado:** Confirme se o nome do projeto (`meupainel`) está correto e se você tem acesso ao time/escopo selecionado.
