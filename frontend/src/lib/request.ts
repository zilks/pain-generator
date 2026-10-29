import { parseAmount } from './form';
import type { FormState, Pain001Request, PostalAddress, TransactionForm, TransactionRequest } from './types';

function postalAddress(t: TransactionForm): PostalAddress | undefined {
  if (t.address === 'structured') {
    return {
      streetName: t.street,
      buildingNumber: t.buildingNumber || undefined,
      postCode: t.postCode,
      townName: t.town,
      country: t.country,
    };
  }
  if (t.address === 'unstructured') {
    return { adrLine: [t.line1, t.line2].filter(Boolean), country: t.country };
  }
  return undefined;
}

function transaction(t: TransactionForm, index: number): TransactionRequest {
  const tx: TransactionRequest = {
    sequenceNumber: index + 1,
    amount: parseAmount(t.amount),
    currency: t.currency.trim().toUpperCase(),
    creditor: { name: t.creditor },
    creditorIban: t.iban,
  };
  const address = postalAddress(t);
  if (address) tx.creditor.postalAddress = address;
  if (t.agent === 'bic') tx.creditorBic = t.bic;
  if (t.agent === 'iid') tx.creditorIid = t.iid;
  if (t.remittance === 'unstructured') tx.remittanceInfoUnstructured = t.remittanceText;
  if (t.remittance === 'structured') {
    if (t.remittanceText) tx.remittanceInfoStructured = t.remittanceText;
    if (t.reference.trim()) tx.creditorReference = t.reference.trim();
  }
  return tx;
}

/** Turns the form state into the API request; features that are switched off are not sent. */
export function buildRequest(state: FormState): Pain001Request {
  const debtor: Pain001Request['debtor'] = { name: state.debtor.name, iban: state.debtor.iban };
  if (state.debtor.agent === 'bic') debtor.bic = state.debtor.bic;
  if (state.debtor.agent === 'iid') debtor.iid = state.debtor.iid;

  const req: Pain001Request = {
    version: state.version,
    testRunId: state.testRunId,
    executionDate: state.executionDate,
    debtor,
    transactions: state.transactions.map(transaction),
    batchBooking: state.options.batchBooking,
  };
  if (state.options.randomMsgId) req.randomMsgId = true;
  if (state.options.creationDateTime) req.creationDateTime = state.creationDateTime;
  if (state.options.initiatingPartyName) req.initiatingPartyName = state.initiatingPartyName;
  return req;
}
