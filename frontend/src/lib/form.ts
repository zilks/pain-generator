import type { FormState, TransactionForm, Version } from './types';

export function emptyTransaction(): TransactionForm {
  return {
    creditor: '', iban: '', amount: '', currency: 'CHF',
    address: 'none', street: '', buildingNumber: '', postCode: '', town: '', country: 'CH', line1: '', line2: '',
    agent: 'none', bic: '', iid: '',
    remittance: 'none', remittanceText: '', reference: '',
  };
}

/** Prefilled example so the form starts in a working, valid state. */
export function initialState(today: string = new Date().toISOString().slice(0, 10)): FormState {
  return {
    version: 'v2009',
    testRunId: 'TEST-01',
    executionDate: today,
    options: { batchBooking: true, randomMsgId: false, creationDateTime: false, initiatingPartyName: false },
    creationDateTime: `${today}T08:00:00`,
    initiatingPartyName: '',
    debtor: { name: 'Muster AG', iban: 'CH56 0483 5012 3456 7800 9', agent: 'none', bic: '', iid: '' },
    transactions: [
      {
        ...emptyTransaction(),
        creditor: 'Max Mustermann',
        iban: 'CH93 0076 2011 6238 5295 7',
        amount: '1.00',
        remittance: 'unstructured',
        remittanceText: 'Testzahlung',
      },
    ],
  };
}

/** The API ignores adrLine in v2019, so unstructured addresses fall back to structured there. */
export function withVersion(state: FormState, version: Version): FormState {
  return {
    ...state,
    version,
    transactions: state.transactions.map((t) =>
      version === 'v2019' && t.address === 'unstructured' ? { ...t, address: 'structured' } : t,
    ),
  };
}

export function parseAmount(value: string): number {
  const n = Number(value.trim().replace(/'/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function totalAmount(state: FormState): number {
  return state.transactions.reduce((sum, t) => sum + parseAmount(t.amount), 0);
}

/** 2250.5 -> "2'250.50" */
export function formatAmount(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

export function fileName(state: FormState): string {
  return `pain001_${state.testRunId}_${state.executionDate}_${state.version}.xml`;
}
