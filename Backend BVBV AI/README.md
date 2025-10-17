# BVBV AI - Backend

Backend para o sistema BVBV AI, compatível com o frontend Lovable. Este sistema permite o upload, processamento e edição de vídeos, gerando automaticamente cortes otimizados para compartilhamento.

## Funcionalidades

- **Upload de Vídeos**: Suporte a upload de vídeos longos
- **Cortes Automáticos**: Geração automática de 10 cortes por vídeo
- **Edição de Cortes**: Personalização de legendas, estilos e ajustes de tempo
- **Exportação**: Exportação de cortes individuais ou em lote
- **API RESTful**: Totalmente compatível com o frontend Lovable

## Requisitos

- Node.js 14+
- FFmpeg e FFprobe instalados no sistema
- npm ou yarn

## Instalação

1. Clone o repositório:
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd bvbv-ai-backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn install
   ```

3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` com suas configurações.

4. Certifique-se de que o FFmpeg e FFprobe estejam instalados e acessíveis no PATH do sistema.

## Executando o Projeto

### Modo Desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

### Modo Produção
```bash
npm start
# ou
yarn start
```

O servidor estará disponível em `http://localhost:5000` por padrão.

## Estrutura do Projeto

```
src/
├── config/               # Configurações do servidor
├── controllers/          # Lógica dos controladores
├── middleware/           # Middlewares personalizados
├── models/               # Modelos de dados (se usar banco de dados)
├── routes/               # Definição das rotas da API
├── services/             # Lógica de negócios
├── utils/                # Utilitários e helpers
├── uploads/              # Armazenamento de vídeos enviados
├── processed/            # Vídeos processados
└── temp/                 # Arquivos temporários
```

## API Endpoints

### Upload de Vídeo
- **POST** `/api/v1/upload-video` - Envia um vídeo para processamento

### Processamento de Vídeo
- **POST** `/api/v1/process-video/:videoId` - Processa o vídeo e gera cortes automáticos

### Edição de Corte
- **PUT** `/api/v1/edit-cut/:videoId/:cutId` - Edita um corte específico

### Exportação de Corte
- **GET** `/api/v1/export-cut/:videoId/:cutId` - Exporta um corte específico

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example` fornecido.

## Testes

Para executar os testes:

```bash
npm test
# ou
yarn test
```

## Deploy

Para produção, recomenda-se o uso de um processo manager como PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name "bvbv-ai-backend"
```

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.
