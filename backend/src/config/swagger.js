const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AnyMentor API',
      version: '1.0.0',
      description: 'Multi-Tenant SaaS Platform API - LMS, E-commerce, CRM',
      contact: { name: 'AnyMentor Support', email: 'support@anymentor.com' },
    },
    servers: [
      { url: '/api/v1', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token (15min expiry)',
        },
      },
      schemas: {
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User management' },
      { name: 'Companies', description: 'Company management' },
      { name: 'LMS', description: 'Learning Management System' },
      { name: 'Ecommerce', description: 'Products, Orders & Payments' },
      { name: 'CRM', description: 'Customer Relationship Management' },
      { name: 'Analytics', description: 'Dashboard & Reports' },
      { name: 'Billing', description: 'Subscriptions & Invoices' },
      { name: 'Support', description: 'Tickets & Knowledge Base' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

module.exports = swaggerJsdoc(options);
