import { describe, it, expect } from '@jest/globals';
import { swaggerSpec } from '../src/swagger';

// ─────────────────────────────────────────────────────────────
// Swagger Specification
// ─────────────────────────────────────────────────────────────
describe('swaggerSpec', () => {

  describe('OpenAPI Metadata', () => {
    it('has the correct OpenAPI version', () => {
      expect(swaggerSpec.openapi).toBe('3.0.0');
    });

    it('has a title and a version', () => {
      expect(swaggerSpec.info.title).toBeTruthy();
      expect(swaggerSpec.info.version).toBeTruthy();
    });
  });

  describe('Endpoints', () => {
    it('documents POST /generate-pain001', () => {
      expect(swaggerSpec.paths).toHaveProperty('/generate-pain001');
      expect(swaggerSpec.paths['/generate-pain001']).toHaveProperty('post');
    });

    it('POST /generate-pain001 has a request body', () => {
      const post = swaggerSpec.paths['/generate-pain001'].post;
      expect(post.requestBody).toBeDefined();
      expect(post.requestBody?.required).toBe(true);
    });

    it('POST /generate-pain001 documents response 200', () => {
      const responses = swaggerSpec.paths['/generate-pain001'].post.responses;
      expect(responses).toHaveProperty('200');
    });

    it('POST /generate-pain001 documents response 422', () => {
      const responses = swaggerSpec.paths['/generate-pain001'].post.responses;
      expect(responses).toHaveProperty('422');
    });
  });

  describe('Schemas', () => {
    it('contains the Pain001Request schema', () => {
      expect(swaggerSpec.components.schemas).toHaveProperty('Pain001Request');
    });

    it('Pain001Request has all required fields defined', () => {
      const required: string[] = swaggerSpec.components.schemas.Pain001Request.required ?? [];
      expect(required).toContain('executionDate');
      expect(required).toContain('testRunId');
      expect(required).toContain('debtor');
      expect(required).toContain('transactions');
    });

    it('contains the DebtorInfo schema', () => {
      expect(swaggerSpec.components.schemas).toHaveProperty('DebtorInfo');
    });

    it('contains the CreditTransfer schema', () => {
      expect(swaggerSpec.components.schemas).toHaveProperty('CreditTransfer');
    });

    it('contains the PostalAddress schema', () => {
      expect(swaggerSpec.components.schemas).toHaveProperty('PostalAddress');
    });
  });

});



