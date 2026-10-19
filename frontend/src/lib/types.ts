export type Version = 'v2009' | 'v2019';
export type AddressMode = 'none' | 'structured' | 'unstructured';
export type AgentMode = 'none' | 'bic' | 'iid';
export type RemittanceMode = 'none' | 'unstructured' | 'structured';

export interface TransactionForm {
  creditor: string;
  iban: string;
  amount: string;
  currency: string;
  address: AddressMode;
  street: string;
  buildingNumber: string;
  postCode: string;
  town: string;
  country: string;
  line1: string;
  line2: string;
  agent: AgentMode;
  bic: string;
  iid: string;
  remittance: RemittanceMode;
  remittanceText: string;
}

export interface FileOptions {
  batchBooking: boolean;
  randomMsgId: boolean;
  creationDateTime: boolean;
  initiatingPartyName: boolean;
}

export interface FormState {
  version: Version;
  testRunId: string;
  executionDate: string;
  options: FileOptions;
  creationDateTime: string;
  initiatingPartyName: string;
  debtor: { name: string; iban: string; agent: AgentMode; bic: string; iid: string };
  transactions: TransactionForm[];
}

/** Request body of POST /api/generate-pain001 (see src/types/pain001.types.ts) */
export interface PostalAddress {
  country: string;
  streetName?: string;
  buildingNumber?: string;
  postCode?: string;
  townName?: string;
  adrLine?: string[];
}

export interface TransactionRequest {
  sequenceNumber: number;
  amount: number;
  currency: string;
  creditor: { name: string; postalAddress?: PostalAddress };
  creditorIban: string;
  creditorBic?: string;
  creditorIid?: string;
  remittanceInfoUnstructured?: string;
  remittanceInfoStructured?: string;
}

export interface Pain001Request {
  version: Version;
  testRunId: string;
  executionDate: string;
  creationDateTime?: string;
  initiatingPartyName?: string;
  batchBooking: boolean;
  randomMsgId?: boolean;
  debtor: { name: string; iban: string; bic?: string; iid?: string };
  transactions: TransactionRequest[];
}

export interface ChipOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
  title?: string;
}
