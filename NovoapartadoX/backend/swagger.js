import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NovoapartadoX API',
      version: '1.0.0',
      description: 'API para plataforma de listagens de acompanhantes',
      contact: {
        name: 'Suporte API',
        email: 'suporte@novoapartadox.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Servidor de desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID do usuário' },
            name: { type: 'string', description: 'Nome do usuário' },
            email: { type: 'string', format: 'email', description: 'Email do usuário' },
            role: { 
              type: 'string', 
              enum: ['admin', 'model'], 
              description: 'Papel do usuário' 
            },
            avatar: { type: 'string', description: 'URL do avatar' },
            phone: { type: 'string', description: 'Telefone' },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Data de atualização' }
          }
        },
        Listing: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID da listagem' },
            name: { type: 'string', description: 'Nome do acompanhante' },
            phone: { type: 'string', description: 'Telefone de contacto' },
            city: { type: 'string', description: 'Cidade' },
            age: { type: 'number', minimum: 18, maximum: 99, description: 'Idade' },
            measurements: {
              type: 'object',
              properties: {
                height: { type: 'number', description: 'Altura em cm' },
                weight: { type: 'number', description: 'Peso em kg' },
                bust: { type: 'number', description: 'Busto em cm' },
                waist: { type: 'number', description: 'Cintura em cm' },
                hips: { type: 'number', description: 'Quadril em cm' }
              }
            },
            services: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Nome do serviço' },
                  price: { type: 'number', minimum: 0, description: 'Preço do serviço' },
                  duration: { type: 'string', description: 'Duração do serviço' }
                }
              }
            },
            description: { type: 'string', description: 'Descrição' },
            photos: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'URLs das fotos' 
            },
            verified: { type: 'boolean', description: 'Verificado' },
            active: { type: 'boolean', description: 'Ativo' },
            featured: { type: 'boolean', description: 'Destaque' },
            category: { 
              type: 'string', 
              enum: ['acompanhante', 'massagista', 'dominatrix', 'outro'], 
              description: 'Categoria' 
            },
            userId: { type: 'string', description: 'ID do usuário proprietário' },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Data de atualização' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', description: 'Token JWT' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Mensagem de erro' },
            details: { type: 'object', description: 'Detalhes do erro' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.mjs']
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NovoapartadoX API Documentation'
  }));
};

export default setupSwagger;