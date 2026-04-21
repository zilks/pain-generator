// ============================================================
// PAIN.001 Generator – TypeScript interfaces & types
// ============================================================

/** Supported PAIN.001 versions */
export type Pain001Version = 'v2009' | 'v2019';

/** Postal address of the creditor */
export interface PostalAddress {
  country: string;          // Ctry (ISO 3166-1 alpha-2) – immer erforderlich

  // Strukturierte Adresse (AdrTp=STRD) – v2009 und v2019
  streetName?: string;      // StrtNm
  buildingNumber?: string;  // BldgNb
  postCode?: string;        // PstCd
  townName?: string;        // TwnNm

  // Unstrukturierte Adresse (AdrTp=ADDR) – nur v2009; max. 2 Zeilen
  adrLine?: string[];       // AdrLine
}

/** Creditor information */
export interface CreditorInfo {
  name: string;             // Cdtr/Nm
  postalAddress?: PostalAddress;
}

/** Debtor information */
export interface DebtorInfo {
  name: string;             // Dbtr/Nm
  iban: string;             // DbtrAcct/Id/IBAN
  bic?: string;             // DbtrAgt/FinInstnId/BIC
  /** IID (clearing member ID) – alternative to BIC */
  iid?: string;             // DbtrAgt/FinInstnId/ClrSysMmbId/MmbId
}

/** Single credit transfer within a PmtInf block */
export interface CreditTransfer {
  /** Sequential number of the transaction within the test run (e.g. 1, 2, 3) */
  sequenceNumber: number;
  amount: number;           // InstdAmt
  currency: string;         // Ccy (e.g. "CHF")
  creditor: CreditorInfo;
  creditorIban: string;     // CdtrAcct/Id/IBAN
  /** BIC of the creditor's financial institution */
  creditorBic?: string;
  /** IID (clearing member ID) of the creditor's institution – alternative to BIC */
  creditorIid?: string;
  /** Unstructured remittance information (RmtInf/Ustrd) */
  remittanceInfoUnstructured?: string;
  /** Structured remittance information (RmtInf/Strd/AddtlRmtInf) */
  remittanceInfoStructured?: string;
}

/** Main request body of the Azure Function */
export interface Pain001Request {
  /** Execution date: YYYY-MM-DD (e.g. "2025-09-29") */
  executionDate: string;

  /** Test/run identifier, appears in all generated IDs (e.g. "VERI-01") */
  testRunId: string;

  /** Creation timestamp; if omitted, the current timestamp is used */
  creationDateTime?: string;

  /** Debtor information (debit account) */
  debtor: DebtorInfo;

  /** Transactions; NbOfTxs and CtrlSum are auto-calculated from this array */
  transactions: CreditTransfer[];

  /** Optional: number of transactions (overrides auto-calculation) */
  nbOfTxs?: number;

  /** Optional: control sum (overrides auto-calculation) */
  ctrlSum?: number;

  /** Optional: initiating party name (defaults to debtor name) */
  initiatingPartyName?: string;

  /** PAIN.001 version; default: v2009 */
  version?: Pain001Version;

  /** Batch booking (BtchBookg); default: true */
  batchBooking?: boolean;

  /** If true, a random 6-digit number (e.g. -123456) is appended to the MsgId */
  randomMsgId?: boolean;
}

// ============================================================
// Internal builder types
// ============================================================

export interface ResolvedPain001Request extends Pain001Request {
  version: Pain001Version;
  nbOfTxs: number;
  ctrlSum: number;
  creationDateTime: string;
  batchBooking: boolean;
}
