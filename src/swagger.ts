import swaggerJsdoc from 'swagger-jsdoc';

export interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  components: {
    schemas: Record<string, {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
      [key: string]: unknown;
    }>;
  };
  paths: Record<string, Record<string, {
    summary?: string;
    operationId?: string;
    tags?: string[];
    requestBody?: {
      required: boolean;
      content: Record<string, unknown>;
    };
    responses: Record<string, unknown>;
  }>>;
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PAIN.001 Generator API',
      version: '1.0.0',
      description: 'Express-Backend zur Generierung von PAIN.001-XML-Dateien nach Schweizer SIX-Standard (v2009 / v2019).',
    },
    servers: [
      {
        url: '/api',
        description: 'API',
      },
    ],
    components: {
      schemas: {
        PostalAddress: {
          type: 'object',
          properties: {
            streetName:     { type: 'string', example: 'Hauptstrasse' },
            buildingNumber: { type: 'string', example: '1' },
            postCode:       { type: 'string', example: '4001' },
            townName:       { type: 'string', example: 'Basel' },
            country:        { type: 'string', example: 'CH', description: 'ISO 3166-1 alpha-2' },
          },
          required: ['streetName', 'postCode', 'townName', 'country'],
        },
        CreditorInfo: {
          type: 'object',
          properties: {
            name:          { type: 'string', example: 'Empfänger GmbH' },
            postalAddress: { $ref: '#/components/schemas/PostalAddress' },
          },
          required: ['name'],
        },
        DebtorInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Muster AG' },
            iban: { type: 'string', example: 'CH9300762011623852957' },
            bic:  { type: 'string', example: 'BANKCH22XXX' },
            iid:  { type: 'string', example: '768', description: 'IID (Clearing-Nr.) – Alternative zu BIC' },
          },
          required: ['name', 'iban'],
        },
        CreditTransfer: {
          type: 'object',
          properties: {
            sequenceNumber:               { type: 'integer', example: 1 },
            amount:                       { type: 'number',  example: 1.00 },
            currency:                     { type: 'string',  example: 'CHF', description: 'ISO 4217' },
            creditor:                     { $ref: '#/components/schemas/CreditorInfo' },
            creditorIban:                 { type: 'string',  example: 'CH5604835012345678009' },
            creditorBic:                  { type: 'string',  example: 'CRESCHZZ80A' },
            creditorIid:                  { type: 'string',  example: '769' },
            remittanceInfoUnstructured:   { type: 'string',  example: 'Rechnung 2025-001' },
            remittanceInfoStructured:     { type: 'string',  example: 'Zusatzinfo strukturiert' },
          },
          required: ['sequenceNumber', 'amount', 'currency', 'creditor', 'creditorIban'],
        },
        Pain001Request: {
          type: 'object',
          properties: {
            executionDate:       { type: 'string', format: 'date', example: '2025-09-29' },
            testRunId:           { type: 'string', example: 'VERI-01' },
            creationDateTime:    { type: 'string', example: '2025-09-29T10:00:00', description: 'Standard: aktueller Zeitstempel' },
            debtor:              { $ref: '#/components/schemas/DebtorInfo' },
            transactions:        { type: 'array', items: { $ref: '#/components/schemas/CreditTransfer' }, minItems: 1 },
            nbOfTxs:             { type: 'integer', example: 1, description: 'Standard: auto aus transactions' },
            ctrlSum:             { type: 'number',  example: 1.00, description: 'Standard: auto aus Beträgen' },
            initiatingPartyName: { type: 'string',  example: 'Muster AG', description: 'Standard: debtor.name' },
            version:             { type: 'string',  enum: ['v2009', 'v2019'], default: 'v2009' },
            batchBooking:        { type: 'boolean', default: true },
            randomMsgId:   { type: 'boolean', default: false, description: 'Hängt eine zufällige 6-stellige Nummer an die MsgId an (z.B. -123456)' },
          },
          required: ['executionDate', 'testRunId', 'debtor', 'transactions'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Validation error' },
            details: { type: 'array', items: { type: 'string' }, example: ['debtor.iban is required'] },
          },
        },
      },
    },
    paths: {
      '/generate-pain001': {
        post: {
          summary: 'PAIN.001 XML generieren',
          description: 'Generiert eine PAIN.001-XML-Datei nach Schweizer SIX-Standard und gibt sie direkt als XML-Datei zurück.',
          operationId: 'generatePain001',
          tags: ['PAIN.001'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pain001Request' },
                examples: {
                  'v2009 – 1 Transaktion': {
                    summary: 'v2009 mit einer Transaktion',
                    value: {
                      executionDate: '2025-09-29',
                      testRunId: 'VERI-01',
                      version: 'v2009',
                      randomMsgId: true,
                      debtor: {
                        name: 'Muster AG',
                        iban: 'CH9300762011623852957',
                      },
                      transactions: [
                        {
                          sequenceNumber: 1,
                          amount: 1.00,
                          currency: 'CHF',
                          creditorIban: 'CH5604835012345678009',
                          creditor: {
                            name: 'Empfänger GmbH'
                          }
                        },
                      ],
                    },
                  },
                  'v2009 – 3 Transaktionen': {
                    summary: 'v2009 mit drei Transaktionen',
                    value: {
                      executionDate: '2025-09-29',
                      testRunId: 'VERI-03',
                      version: 'v2009',
                      randomMsgId: true,
                      debtor: {
                        name: 'Muster AG',
                        iban: 'CH9300762011623852957',
                      },
                      transactions: [
                        { sequenceNumber: 1, amount: 1.00, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 1' } },
                        { sequenceNumber: 2, amount: 2.50, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 2' } },
                        { sequenceNumber: 3, amount: 3.75, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 3' } },
                      ],
                    },
                  },
                  'v2019 – 1 Transaktion': {
                    summary: 'v2019 mit einer Transaktion (BICFI, ReqdExctnDt/Dt)',
                    value: {
                      executionDate: '2025-09-29',
                      testRunId: 'VERI-01',
                      version: 'v2019',
                      randomMsgId: true,
                      debtor: {
                        name: 'Muster AG',
                        iban: 'CH9300762011623852957',
                        bic: 'BANKCH22XXX',
                      },
                      transactions: [
                        {
                          sequenceNumber: 1,
                          amount: 1.00,
                          currency: 'CHF',
                          creditorIban: 'CH5604835012345678009',
                          creditorIid: '769',
                          creditor: {
                            name: 'Empfänger GmbH',
                            postalAddress: {
                              streetName: 'Hauptstrasse',
                              buildingNumber: '1',
                              postCode: '4001',
                              townName: 'Basel',
                              country: 'CH',
                            },
                          },
                          remittanceInfoStructured: 'Zusatzinfo: QR-IBAN BANK, QR-Ref, CdtrAgt IID',
                        },
                      ],
                    },
                  },
                  'v2019 – 3 Transaktionen': {
                    summary: 'v2019 mit drei Transaktionen (NbOfTxs/CtrlSum auto)',
                    value: {
                      executionDate: '2025-09-29',
                      testRunId: 'VERI-03',
                      version: 'v2019',
                      randomMsgId: true,
                      debtor: {
                        name: 'Muster AG',
                        iban: 'CH9300762011623852957',
                        bic: 'BANKCH22XXX',
                      },
                      transactions: [
                        { sequenceNumber: 1, amount: 1.00, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 1' } },
                        { sequenceNumber: 2, amount: 2.50, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 2' } },
                        { sequenceNumber: 3, amount: 3.75, currency: 'CHF', creditorIban: 'CH5604835012345678009', creditor: { name: 'Empfänger 3' } },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'PAIN.001 XML-Datei erfolgreich generiert',
              headers: {
                'Content-Disposition': {
                  schema: { type: 'string' },
                  example: 'attachment; filename="pain001_VERI-01_2025-09-29_v2009.xml"',
                },
              },
              content: {
                'application/xml': {
                  schema: { type: 'string', format: 'binary' },
                },
              },
            },
            '400': {
              description: 'Request body ist kein gültiges JSON',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
            '422': {
              description: 'Validierungsfehler im Request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
            '500': {
              description: 'Interner Fehler bei der XML-Generierung',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Internal server error' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options) as SwaggerSpec;

