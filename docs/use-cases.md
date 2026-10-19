# Use Cases & Varianten

Diese Seite beschreibt, welche Arten von PAIN.001-Dateien der Generator erzeugen kann, welche Request-Felder dafür nötig sind und wie das Ergebnis im XML aussieht. Für die Grundlagen (Endpunkt, Parameter-Tabelle, Deployment) siehe [README](../README.md).

> ⚠️ Die generierten Dateien sind ausschliesslich für Testzwecke gedacht (siehe Disclaimer im README).

Zu jedem Use Case gibt es einen lauffähigen Beispiel-Request unter [`docs/examples/`](examples/). Die Beispiele werden in `tests/unit/docs-examples.unit.test.ts` automatisch gegen den Generator geprüft, damit Doku und Code nicht auseinanderlaufen.

```bash
curl -X POST http://localhost:8080/api/generate-pain001 \
  -H "Content-Type: application/json" \
  -d @docs/examples/uc03-adresse-strukturiert.json
```

## Übersicht

| # | Use Case | Version | Beispiel |
|---|----------|---------|----------|
| UC01 | Minimale Zahlung | v2009 | [uc01-minimal-v2009.json](examples/uc01-minimal-v2009.json) |
| UC02 | Minimale Zahlung | v2019 | [uc02-minimal-v2019.json](examples/uc02-minimal-v2019.json) |
| UC03 | Strukturierte Kreditor-Adresse | v2009 / v2019 | [uc03-adresse-strukturiert.json](examples/uc03-adresse-strukturiert.json) |
| UC04 | Unstrukturierte Kreditor-Adresse | nur v2009 | [uc04-adresse-unstrukturiert-v2009.json](examples/uc04-adresse-unstrukturiert-v2009.json) |
| UC05 | Institut über IID (Clearing-Nr.) statt BIC | v2009 / v2019 | [uc05-iid-clearing.json](examples/uc05-iid-clearing.json) |
| UC06 | Verwendungszweck unstrukturiert / strukturiert / beides | v2009 / v2019 | [uc06-verwendungszweck.json](examples/uc06-verwendungszweck.json) |
| UC07 | Mehrere Transaktionen (Sammelauftrag) | v2009 / v2019 | [uc07-mehrere-transaktionen.json](examples/uc07-mehrere-transaktionen.json) |
| UC08 | Eindeutige MsgId bei wiederholten Testläufen | v2009 / v2019 | [uc08-eindeutige-msgid.json](examples/uc08-eindeutige-msgid.json) |
| UC09 | Einzelbuchung, abweichender Auftraggeber, fixer Zeitstempel | v2009 / v2019 | [uc09-einzelbuchung.json](examples/uc09-einzelbuchung.json) |
| UC10 | Negativtest: falsche Anzahl / Kontrollsumme | v2009 / v2019 | [uc10-negativtest-kontrollsumme.json](examples/uc10-negativtest-kontrollsumme.json) |
| UC11 | Fremdwährung / EUR in den SEPA-Raum | v2009 / v2019 | [uc11-eur-sepa-raum.json](examples/uc11-eur-sepa-raum.json) |

## Varianten-Matrix

Jeder Use Case ist eine Kombination der folgenden, voneinander unabhängigen Dimensionen. Sie lassen sich frei kombinieren (z.B. v2019 + IID + strukturierte Adresse + mehrere Transaktionen).

| Dimension | Varianten | Steuerung im Request |
|-----------|-----------|----------------------|
| PAIN-Version | `v2009` (pain.001.001.03.ch.02), `v2019` (pain.001.001.09.ch.03) | `version` (Standard `v2009`) |
| Kreditor-Adresse | keine · strukturiert · unstrukturiert (nur v2009) | `creditor.postalAddress` |
| Debitor-Institut | keine Angabe · BIC · IID | `debtor.bic` / `debtor.iid` |
| Kreditor-Institut | keine Angabe · BIC · IID | `creditorBic` / `creditorIid` |
| Verwendungszweck | keiner · `Ustrd` · `Strd/AddtlRmtInf` · beide | `remittanceInfoUnstructured` / `remittanceInfoStructured` |
| Anzahl Transaktionen | 1 bis n, alle in einem `PmtInf`-Block | `transactions[]` |
| Buchungsart | Sammelbuchung · Einzelbuchung | `batchBooking` (Standard `true`) |
| Kopfdaten | automatisch berechnet · explizit überschrieben | `nbOfTxs`, `ctrlSum`, `creationDateTime`, `initiatingPartyName` |
| MsgId | deterministisch · mit Zufalls-Suffix | `randomMsgId` (Standard `false`) |

## Use Cases im Detail

### UC01 / UC02 – Minimale Zahlung

Nur Pflichtfelder: Debitor mit Name und IBAN, eine Transaktion mit Betrag, Währung, Kreditor-Name und Kreditor-IBAN. Geeignet als Rauchtest, ob eine Bank bzw. ein System die Datei grundsätzlich annimmt.

Unterschiede im XML zwischen den Versionen: siehe [README – Unterschiede v2009 vs. v2019](../README.md#unterschiede-v2009-vs-v2019). In v2019 wird `CdtrAgt` weggelassen, wenn weder `creditorBic` noch `creditorIid` gesetzt ist.

### UC03 – Strukturierte Kreditor-Adresse

Pflicht sind `streetName`, `postCode`, `townName` und `country`; `buildingNumber` ist optional.

- **v2009:** `<AdrTp>STRD</AdrTp>` gefolgt von den Einzelfeldern
- **v2019:** Einzelfelder ohne `AdrTp` (Typ `PostalAddress24_pain001_ch_3`)

### UC04 – Unstrukturierte Kreditor-Adresse (nur v2009)

`adrLine` mit maximal 2 Zeilen plus `country`. Sobald `adrLine` mindestens einen Eintrag hat, wird die Adresse als unstrukturiert behandelt und die Strassen-/Ortsfelder werden ignoriert. Weitere Zeilen ab der dritten werden abgeschnitten.

Im XML: `<AdrTp>ADDR</AdrTp>`, je ein `<AdrLine>`, dann `<Ctry>`.

### UC05 – Institut über IID (Clearing-Nr.)

Statt eines BIC kann das Institut über die Schweizer IID identifiziert werden. Das gilt für Debitor (`debtor.iid`) und Kreditor (`creditorIid`) unabhängig voneinander.

```xml
<FinInstnId>
  <ClrSysMmbId>
    <ClrSysId><Cd>CHBCC</Cd></ClrSysId>
    <MmbId>762</MmbId>
  </ClrSysMmbId>
</FinInstnId>
```

Sind BIC **und** IID angegeben, gewinnt der BIC; die IID wird dann nicht ausgegeben.

### UC06 – Verwendungszweck

| Request-Feld | XML | Typischer Einsatz |
|--------------|-----|-------------------|
| `remittanceInfoUnstructured` | `RmtInf/Ustrd` | Freitext, z.B. Rechnungsnummer |
| `remittanceInfoStructured` | `RmtInf/Strd/AddtlRmtInf` | Zusatzinformation im strukturierten Block |
| beide | `Ustrd` und `Strd` im selben `RmtInf` | Kombinationstests |

Eine strukturierte Referenz (`Strd/CdtrRefInf`, z.B. QR- oder SCOR-Referenz) wird noch **nicht** unterstützt, siehe [Nicht unterstützt](#noch-nicht-unterstützt).

### UC07 – Mehrere Transaktionen

Alle Transaktionen landen in **einem** `PmtInf`-Block mit gemeinsamem Debitor und Ausführungsdatum. `NbOfTxs` entspricht der Anzahl Einträge, `CtrlSum` der Summe aller Beträge (auf 2 Nachkommastellen gerundet).

Aus `testRunId`, `sequenceNumber` und `executionDate` entstehen die IDs:

| Element | Schema | Beispiel |
|---------|--------|----------|
| `MsgId` | `MSG-{testRunId}-{date}` | `MSG-UC07-2026-05-01` |
| `PmtInfId` | `PAY-{testRunId}-{date}` | `PAY-UC07-2026-05-01` |
| `InstrId` | `INS-{testRunId}-{seq}-{date}` | `INS-UC07-03-2026-05-01` |
| `EndToEndId` | `E2E-{testRunId}-{seq}-{date}` | `E2E-UC07-03-2026-05-01` |

`{seq}` wird zweistellig mit führender Null aufgefüllt (`01` … `09`, ab `10` unverändert). Die `sequenceNumber` muss vom Aufrufer eindeutig vergeben werden; der Generator prüft das nicht.

Der Dateiname der Antwort lautet `pain001_{testRunId}_{executionDate}_{version}.xml`.

### UC08 – Eindeutige MsgId bei wiederholten Testläufen

Banken weisen Dateien mit bereits verarbeiteter `MsgId` oft als Duplikat zurück. Mit `"randomMsgId": true` wird eine 6-stellige Zufallszahl angehängt (`MSG-UC08-2026-05-01-483920`). `PmtInfId`, `InstrId` und `EndToEndId` bleiben unverändert.

### UC09 – Einzelbuchung, Auftraggeber und Zeitstempel

- `"batchBooking": false` ergibt `<BtchBookg>false</BtchBookg>` (Einzelbelastung pro Transaktion statt Sammelbelastung).
- `initiatingPartyName` setzt `GrpHdr/InitgPty/Nm`, z.B. wenn ein Treuhänder im Namen des Kontoinhabers einreicht. Ohne Angabe wird der Debitor-Name verwendet.
- `creationDateTime` (`YYYY-MM-DDTHH:MM:SS`) fixiert `CreDtTm`; ohne Angabe wird die aktuelle Zeit (UTC) eingesetzt. Nützlich für reproduzierbare Dateien.

### UC10 – Negativtest: falsche Anzahl / Kontrollsumme

`nbOfTxs` und `ctrlSum` überschreiben die automatisch berechneten Werte, ohne dass der Generator sie gegen die Transaktionen abgleicht. So lassen sich bewusst inkonsistente Dateien erzeugen, um die Fehlerbehandlung einer Bank oder eines Systems zu testen.

### UC11 – Fremdwährung / EUR in den SEPA-Raum

Währung, Kreditor-IBAN und -BIC sind frei wählbar; die Bank leitet die Zahlungsart daraus ab. Ein `PmtTpInf`-Element (z.B. `SvcLvl/Cd=SEPA`) wird noch **nicht** gesetzt. Hintergrund und das gewünschte Ziel-XML: [README – Zahlungsarten](../README.md#zahlungsarten-sepa-vs-bankzahlung-ausland).

Hinweis: `CtrlSum` summiert alle Beträge unabhängig von der Währung.

## Validierung (HTTP 422)

Der Generator prüft vor der XML-Erzeugung:

| Prüfung | Regel |
|---------|-------|
| `executionDate` | Pflicht, Format `YYYY-MM-DD` |
| `testRunId` | Pflicht, nicht leer |
| `creationDateTime` | falls gesetzt: `YYYY-MM-DDTHH:MM:SS` |
| `version` | falls gesetzt: `v2009` oder `v2019` |
| `nbOfTxs` / `ctrlSum` | falls gesetzt: > 0 |
| `debtor.name` / `debtor.iban` | Pflicht; IBAN mit Prüfziffer validiert (Leerzeichen erlaubt, werden entfernt) |
| `transactions` | mindestens 1 Eintrag |
| `sequenceNumber` / `amount` | > 0 |
| `currency` | 3 Zeichen |
| `creditorIban` | Pflicht, Prüfziffer validiert |
| `creditor.name` | Pflicht |
| `postalAddress` strukturiert | `streetName`, `postCode`, `townName` Pflicht |
| `postalAddress.country` | 2 Grossbuchstaben (ISO 3166-1 alpha-2) |

Nicht geprüft werden u.a. das Format von BIC und IID, die Gültigkeit des Währungscodes, Längenbeschränkungen der SIX-Schemas und die XSD-Konformität des Ergebnisses.

## Bekannte Einschränkungen

- **Leeres `FinInstnId`:** Ohne `debtor.bic`/`debtor.iid` wird `<DbtrAgt><FinInstnId/></DbtrAgt>` erzeugt (beide Versionen). In v2009 gilt dasselbe für `CdtrAgt` ohne `creditorBic`/`creditorIid`. Für bankseitige Tests sollte daher mindestens beim Debitor BIC oder IID angegeben werden.
- **`adrLine` in v2019:** Wird eine unstrukturierte Adresse an v2019 übergeben, wird sie ohne Fehlermeldung verworfen; im XML steht nur `<Ctry>`.
- **Ein `PmtInf`-Block pro Datei:** Mehrere Debitoren oder Ausführungsdaten in einer Datei sind nicht möglich.

## Noch nicht unterstützt

| Thema | Status |
|-------|--------|
| Zahlungsart über `PmtTpInf` (SEPA, Ausland, `CtgyPurp`) | dokumentiert im README, nicht implementiert |
| QR-Rechnung mit QR-Referenz (`Strd/CdtrRefInf`, QRR) / SCOR-Referenz | nicht implementiert |
| Postadresse des Debitors | nicht implementiert |
| Kreditor-Konto ohne IBAN (z.B. Kontonummer bei Auslandzahlungen) | nicht implementiert |
| Ultimate Debtor / Ultimate Creditor | nicht implementiert |
| Mehrere `PmtInf`-Blöcke | nicht implementiert |
| Andere Nachrichtentypen (pain.002, pain.008, camt) | nicht geplant |
