/** Maps API validation messages ("transactions[2].creditorIban ...") to form field keys. */

const TX_FIELDS: Record<string, string> = {
  sequenceNumber: 'sequenceNumber',
  amount: 'amount',
  currency: 'currency',
  creditorIban: 'iban',
  'creditor.name': 'creditor',
  'creditor.postalAddress.streetName': 'street',
  'creditor.postalAddress.postCode': 'postCode',
  'creditor.postalAddress.townName': 'town',
  'creditor.postalAddress.country': 'country',
  creditorReference: 'reference',
};

const TOP_FIELDS: Record<string, string> = {
  executionDate: 'executionDate',
  testRunId: 'testRunId',
  creationDateTime: 'creationDateTime',
  'debtor.name': 'debtor.name',
  'debtor.iban': 'debtor.iban',
};

/** Returns e.g. "tx.1.iban", "debtor.iban" or undefined if the message belongs to no single field. */
export function fieldKey(detail: string): string | undefined {
  const tx = /^transactions\[(\d+)\]\.([A-Za-z.]+)/.exec(detail);
  if (tx) {
    const field = TX_FIELDS[tx[2]];
    return field ? `tx.${Number(tx[1]) - 1}.${field}` : undefined;
  }
  const top = /^([A-Za-z.]+)/.exec(detail);
  return top ? TOP_FIELDS[top[1]] : undefined;
}

export function errorsByField(details: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of details) {
    const key = fieldKey(d);
    if (key && !(key in out)) out[key] = d;
  }
  return out;
}
