# Fluxo de Caixa - layout profissional

## Estrutura
- `index.html` - entrada
- `dashboard.html` - Dashboard
- `lancamentos.html` - Lançamentos
- `parcelas.html` - Parcelas
- `cadastros.html` - Cadastros
- `relatorios.html` - Relatórios
- `css/style.css` - tema e layout compartilhado
- `js/ui.js` - navegação visual, tema White/Black Label, tabs, modais e fallbacks
- `js/config.js` - substitua pelo seu arquivo original
- `js/app.js` - substitua pelo seu arquivo original

## White Label / Black Label
Os dois botões ficam no rodapé do menu lateral. A escolha é gravada em `localStorage`, então permanece ativa ao trocar de página.

## Integração com seu projeto atual
O HTML original chamava funções como `renderDashboard()`, `carregarTudo()`, `renderLancamentos()`, `abrirFormLancamento()`, `renderParcelas()`, `abrirFormCadastro()` e `gerarPDF()`. Os novos arquivos preservam essas chamadas. Para recuperar a regra de negócio, copie seus `config.js` e `app.js` atuais para a pasta `js/`, substituindo os arquivos de exemplo.

## Observação
Como somente o HTML foi enviado, a lógica real de dados e o CSS/JS originais não estavam disponíveis. Por isso, este pacote entrega a nova estrutura, visual e navegação, com pontos de integração preservados.
