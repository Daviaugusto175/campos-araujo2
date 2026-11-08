# Campos Araújo · Gestão de Ovinos

Aplicação web de gestão de rebanho, construída em HTML, CSS e JavaScript puro, sem etapa de build.

## Como executar

1. Extraia a pasta do projeto.
2. Abra `index.html` em um navegador moderno.
3. Para exportar relatórios em Excel, mantenha conexão com a internet para carregar a biblioteca `xlsx-js-style` (compatível com SheetJS) pelo CDN. Os cadastros e consultas continuam funcionando sem a biblioteca; a exportação `.xlsx` exige que ela esteja carregada.

Também é possível executar a pasta com a extensão **Live Server** do Visual Studio Code.

## Funcionalidades

- Cadastro e consulta individual de animais, incluindo brinco, nome, raça, sexo, nascimento, categoria, lote e procedência.
- Rebanho em destaque no início da aplicação.
- Histórico individual de pesagens e gráfico mensal com médias por mês; os pontos do gráfico exibem detalhes das pesagens ao passar o mouse ou receber foco.
- Exportação Excel das pesagens de todo o rebanho ou do animal selecionado.
- Controle de medicações/aplicações com produto, dosagem, unidade, finalidade, responsável, data, hora, carência e observações.
- Histórico de medicações por animal e consulta geral com filtros por animal, produto, responsável e período.
- Exportação Excel do histórico geral ou filtrado de medicações.
- Ficha individual exportável para Excel, com três abas: `IDENTIFICACAO`, `PESAGENS` e `MEDICACOES`.
- Monitoramento Famacha/OPG, gestação e tarefas da propriedade.
- Interface responsiva e temas claro/escuro.

## Estrutura

- `index.html` — estrutura da aplicação e carregamento das bibliotecas.
- `css/style.css` — identidade visual, componentes e responsividade.
- `js/utils.js` — datas, números, formatação e utilitários.
- `js/icons.js` — ícones locais.
- `js/store.js` — persistência local e regras de negócio.
- `js/ui.js` — componentes visuais, tabelas, formulários e gráficos SVG.
- `js/views.js` — telas, formulários, ações e exportações Excel.
- `js/charts.js` — configurações globais de gráficos Chart.js.
- `js/theme.js` — alternância de tema.
- `js/main.js` — navegação e eventos da aplicação.

## Armazenamento e segurança dos dados

Os dados são armazenados no `localStorage` do navegador, usando a chave `campos_araujo_ovinos_v1`. Isso significa que os dados ficam neste navegador e neste perfil de usuário; não existe sincronização automática entre computadores ou celulares.

A aplicação mantém os registros existentes na chave atual. Em uma instalação sem dados, começa com as coleções vazias, sem animais ou lançamentos fictícios. Antes de limpar os dados do navegador, trocar de perfil ou computador, faça uma cópia/backup do armazenamento.

## Exportações

Os arquivos `.xlsx` são gerados localmente no navegador por meio da biblioteca `xlsx-js-style`, que gera planilhas com cabeçalhos formatados, larguras de coluna e filtros. A ficha individual contém:
- **IDENTIFICACAO** — dados cadastrais e informações disponíveis do animal.
- **PESAGENS** — todas as pesagens vinculadas ao animal, em ordem cronológica.
- **MEDICACOES** — todas as aplicações vinculadas ao animal, com responsável, data e hora.

Os relatórios gerais exportam uma linha por registro. A exportação XLSX preserva textos em português e caracteres acentuados.

## Observações

- Campos que não existiam nos registros antigos (por exemplo, responsável ou finalidade de aplicações anteriores) aparecerão vazios nos relatórios antigos; os novos formulários passam a coletar essas informações.
- A aplicação é local e demonstrativa: para uso compartilhado por vários usuários/dispositivos, será necessário integrar um backend e um banco de dados centralizado.
