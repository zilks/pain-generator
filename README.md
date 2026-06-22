# PAIN.001 Generator – Express Backend

[![CI / CD](https://github.com/zilks/pain-generator/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zilks/pain-generator/actions/workflows/ci-cd.yml)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

Express-Backend (TypeScript) zur Generierung von PAIN.001-XML-Dateien nach Schweizer SIX-Standard.

> ⚠️ **Disclaimer**
> Dieses Projekt wurde **nicht** von einem Fachexperten (z.B. Zahlungsverkehrsspezialist oder zertifiziertem ISO-20022-Berater) erstellt. Es besteht **keine Gewähr** auf die fachliche oder technische Korrektheit der generierten XML-Dateien sowie der Dokumentation.
> Die generierten PAIN.001-Dateien sind **ausschliesslich für Testzwecke** gedacht und dürfen **nicht** für produktive Zahlungsaufträge oder den Einsatz im Rahmen von Bankprozessen verwendet werden.

## Unterstützte Versionen

| Version | Schema | Namespace |
|---------|--------|-----------|
| `v2009` | `pain.001.001.03.ch.02.xsd` | `http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd` |
| `v2019` | `pain.001.001.09.ch.03.xsd` | `urn:iso:std:iso:20022:tech:xsd:pain.001.001.09` |

### Unterschiede v2009 vs. v2019

Die Request-Parameter sind für beide Versionen identisch. Die Unterschiede betreffen ausschliesslich die generierte XML-Struktur:

| Merkmal | v2009 | v2019 |
|---------|-------|-------|
| **Namespace** | `http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd` | `urn:iso:std:iso:20022:tech:xsd:pain.001.001.09` |
| **Ausführungsdatum** | `<ReqdExctnDt>2025-09-29</ReqdExctnDt>` | `<ReqdExctnDt><Dt>2025-09-29</Dt></ReqdExctnDt>` |
| **BIC-Element** | `<BIC>BANKCH22XXX</BIC>` | `<BICFI>BANKCH22XXX</BICFI>` |
| **Postadresse Kreditor** | Mit `<AdrTp>` erlaubt | Ohne `<AdrTp>` (`PostalAddress24_pain001_ch_3`) |
| **Standard seit** | 2009 | 2020 (ISO 20022 pain.001.001.09) |

## Kreditor-Adressen (Postal Address)

Die Adresse des Kreditors (`postalAddress`) ist optional. Wenn sie angegeben wird, unterscheiden sich Format und Verarbeitung je nach PAIN.001-Version.

### v2009 – Strukturierte Adresse (`AdrTp=STRD`)

Einzelne Adressfelder werden separat übergeben. Im XML werden `<AdrTp>STRD</AdrTp>` sowie die entsprechenden Unterelemente gerendert.

```json
"postalAddress": {
  "streetName": "Hauptstrasse",
  "buildingNumber": "1",
  "postCode": "4001",
  "townName": "Basel",
  "country": "CH"
}
```

**Im XML:**
```xml
<PstlAdr>
  <AdrTp>STRD</AdrTp>
  <StrtNm>Hauptstrasse</StrtNm>
  <BldgNb>1</BldgNb>
  <PstCd>4001</PstCd>
  <TwnNm>Basel</TwnNm>
  <Ctry>CH</Ctry>
</PstlAdr>
```

### v2009 – Unstrukturierte Adresse (`AdrTp=ADDR`)

Freitext-Adresszeilen (max. 2 `AdrLine`-Einträge) werden als kombinierte Zeilen übergeben. Im XML werden `<AdrTp>ADDR</AdrTp>` sowie je ein `<AdrLine>` gerendert.

```json
"postalAddress": {
  "adrLine": ["Hauptstrasse 1", "4001 Basel"],
  "country": "CH"
}
```

**Im XML:**
```xml
<PstlAdr>
  <AdrTp>ADDR</AdrTp>
  <AdrLine>Hauptstrasse 1</AdrLine>
  <AdrLine>4001 Basel</AdrLine>
  <Ctry>CH</Ctry>
</PstlAdr>
```

### v2019 – Strukturierte Adresse (`PostalAddress24_pain001_ch_3`)

In v2019 wird ausschliesslich die strukturierte Variante unterstützt. `AdrTp` ist gemäss SIX-Schema (`PostalAddress24_pain001_ch_3`) **nicht** erlaubt – die Felder werden direkt gerendert. `adrLine` wird in v2019 ignoriert.

```json
"postalAddress": {
  "streetName": "Hauptstrasse",
  "buildingNumber": "1",
  "postCode": "4001",
  "townName": "Basel",
  "country": "CH"
}
```

**Im XML:**
```xml
<PstlAdr>
  <StrtNm>Hauptstrasse</StrtNm>
  <BldgNb>1</BldgNb>
  <PstCd>4001</PstCd>
  <TwnNm>Basel</TwnNm>
  <Ctry>CH</Ctry>
</PstlAdr>
```

### Übersicht

| Merkmal | v2009 strukturiert | v2009 unstrukturiert | v2019 |
|---|---|---|---|
| `AdrTp` | `STRD` | `ADDR` | nicht vorhanden |
| Adressfelder | `StrtNm`, `BldgNb`, `PstCd`, `TwnNm` | – | `StrtNm`, `BldgNb`, `PstCd`, `TwnNm` |
| `AdrLine` | – | max. 2 Zeilen | nicht unterstützt |
| `Ctry` | ✅ | ✅ | ✅ |

## Zahlungsarten: SEPA vs. Bankzahlung Ausland

> ⚠️ **Aktueller Stand:** Der Generator setzt **kein** `<PmtTpInf>`-Element. Die Bank leitet den Zahlungstyp selbst aus IBAN, BICFI und Währung ab. Eine explizite Signalisierung der Zahlungsart über `SvcLvl` ist **noch nicht implementiert**.

### Hintergrund

Im ISO-20022-Standard wird die Zahlungsart über das optionale Element `PmtTpInf` (Payment Type Information) gesteuert. Dieses enthält u.a.:

| Element | Pfad im XML | Bedeutung |
|---|---|---|
| `SvcLvl/Cd` | `PmtInf/PmtTpInf/SvcLvl/Cd` | `SEPA` für SEPA Credit Transfer |
| `LclInstrm` | `PmtInf/PmtTpInf/LclInstrm` | Proprietary-Code für Auslandzahlung |
| `CtgyPurp/Cd` | `PmtInf/PmtTpInf/CtgyPurp/Cd` | Zweck (z.B. `SALA`, `SUPP`) |

### SEPA-Zahlung (SCT)

**Voraussetzungen:**
- Creditor-IBAN liegt in einem SEPA-Land
- Währung `EUR`
- `creditorBic` ist ein gültiger SEPA-BICFI

**Gewünschtes XML (noch nicht generiert):**
```xml
<PmtTpInf>
  <SvcLvl>
    <Cd>SEPA</Cd>
  </SvcLvl>
</PmtTpInf>
```

**Beispiel-Request (v2019):**
```json
{
  "version": "v2019",
  "testRunId": "SEPA-01",
  "executionDate": "2026-05-01",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH5604835012345678009",
    "bic": "CRESCHZZ80A"
  },
  "transactions": [{
    "sequenceNumber": 1,
    "amount": 250.00,
    "currency": "EUR",
    "creditor": {
      "name": "Müller GmbH",
      "postalAddress": {
        "streetName": "Berliner Allee",
        "buildingNumber": "12",
        "postCode": "10115",
        "townName": "Berlin",
        "country": "DE"
      }
    },
    "creditorIban": "DE89370400440532013000",
    "creditorBic": "COBADEFFXXX",
    "remittanceInfoUnstructured": "Rechnung 2026-0099"
  }]
}
```

### Bankzahlung Ausland (SWIFT)

**Voraussetzungen:**
- Creditor-IBAN liegt ausserhalb des SEPA-Raums **oder** Währung ist nicht `EUR`
- `creditorBic` ist ein SWIFT-BIC

**Gewünschtes XML (noch nicht generiert):**
```xml
<PmtTpInf>
  <SvcLvl>
    <Prtry>SWIFT</Prtry>
  </SvcLvl>
</PmtTpInf>
```

**Beispiel-Request (v2019):**
```json
{
  "version": "v2019",
  "testRunId": "AUSLAND-01",
  "executionDate": "2026-05-01",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH5604835012345678009",
    "bic": "CRESCHZZ80A"
  },
  "transactions": [{
    "sequenceNumber": 1,
    "amount": 1000.00,
    "currency": "USD",
    "creditor": {
      "name": "Acme Corp",
      "postalAddress": {
        "streetName": "5th Avenue",
        "buildingNumber": "350",
        "postCode": "10001",
        "townName": "New York",
        "country": "US"
      }
    },
    "creditorIban": "DE89370400440532013000",
    "creditorBic": "CHASUS33XXX",
    "remittanceInfoUnstructured": "Invoice 2026-0099"
  }]
}
```

### Vergleich

| Merkmal | SEPA (SCT) | Bankzahlung Ausland |
|---|---|---|
| Währung | `EUR` | beliebig (z.B. `USD`, `GBP`, `CHF`) |
| IBAN-Land | SEPA-Raum | weltweit |
| `SvcLvl/Cd` | `SEPA` | – |
| `SvcLvl/Prtry` | – | z.B. `SWIFT` |
| `PmtTpInf` im Generator | ❌ noch nicht implementiert | ❌ noch nicht implementiert |

---

## Deployment (Render)

Der Service wird automatisch via GitHub Actions auf [Render](https://render.com) deployed, sobald ein Push auf den `main`-Branch erfolgt.

### Basis-URL

```
https://pain-generator.onrender.com
```

#### Beispiel-Aufruf

````
POST https://pain-generator.onrender.com/api/generate-pain001
Content-Type: application/json

Request-Body: siehe Beispiel-Request weiter unten
````

> **Hinweis:** Render schaltet Web Services auf dem kostenlosen Plan nach ~15 Minuten Inaktivität schlafen. Der erste Request nach einer Schlafphase kann 30–60 Sekunden dauern (Cold Start).

---

## Swagger Dokumentation

Die interaktive API-Dokumentation ist unter dem `/api`-Pfad erreichbar und erlaubt es, Requests direkt im Browser abzusetzen.

| Umgebung | URL |
|----------|-----|
| Lokal | `http://localhost:8080/api` |
| Render | `https://pain-generator.onrender.com/api` |

---

## Endpunkt

```
POST /api/generate-pain001
Content-Type: application/json
```

## Request-Parameter

> Die Parameter gelten für beide Versionen (`v2009` und `v2019`) gleichermassen. Der gewünschte Standard wird über das Feld `version` gesteuert. Die Unterschiede zwischen den Versionen betreffen ausschliesslich die XML-Ausgabe – siehe [Unterschiede v2009 vs. v2019](#unterschiede-v2009-vs-v2019).

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `executionDate` | `string` | ✅ | Ausführungsdatum (YYYY-MM-DD) – erscheint in allen IDs |
| `testRunId` | `string` | ✅ | Laufkennung (z.B. `VERI-01`) – erscheint in allen IDs |
| `debtor.name` | `string` | ✅ | Name des Schuldners (Belastungskonto-Inhaber) |
| `debtor.iban` | `string` | ✅ | IBAN des Belastungskontos |
| `debtor.bic` | `string` | – | BIC des Schuldner-Instituts |
| `debtor.iid` | `string` | – | IID (Clearing-Nr.) des Schuldner-Instituts |
| `transactions` | `array` | ✅ | Array von Überweisungen (mind. 1) |
| `transactions[].sequenceNumber` | `number` | ✅ | Laufnummer der Transaktion (1, 2, 3…) |
| `transactions[].amount` | `number` | ✅ | Betrag |
| `transactions[].currency` | `string` | ✅ | Währung (ISO 4217, z.B. `CHF`) |
| `transactions[].creditorIban` | `string` | ✅ | IBAN des Gutschriftskontos |
| `transactions[].creditor.name` | `string` | ✅ | Name des Begünstigten |
| `transactions[].creditor.postalAddress` | `object` | – | Adresse des Begünstigten |
| `transactions[].creditorBic` | `string` | – | BIC des Empfänger-Instituts |
| `transactions[].creditorIid` | `string` | – | IID des Empfänger-Instituts |
| `transactions[].remittanceInfoUnstructured` | `string` | – | Verwendungszweck (Freitext) |
| `transactions[].remittanceInfoStructured` | `string` | – | Verwendungszweck (strukturiert, AddtlRmtInf) |
| `nbOfTxs` | `number` | – | Anzahl Transaktionen (Standard: auto aus Array) |
| `ctrlSum` | `number` | – | Kontrollsumme (Standard: auto aus Beträgen) |
| `version` | `"v2009"` \| `"v2019"` | – | PAIN-Version (Standard: `v2009`) |
| `batchBooking` | `boolean` | – | Sammelüberweisung (Standard: `true`) |
| `creationDateTime` | `string` | – | Erstellungszeit (Standard: jetzt) |
| `initiatingPartyName` | `string` | – | Auftraggeber-Name (Standard: Debtor-Name) |

## Beispiel-Request (v2009 – simple Variante)

```json
POST /api/generate-pain001
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-01",
  "version": "v2009",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957"
  },
  "transactions": [
    {
      "sequenceNumber": 1,
      "amount": 1.00,
      "currency": "CHF",
      "creditorIban": "CH5604835012345678009",
      "creditor": {
        "name": "Empfänger GmbH"
      }
    }
  ]
}
```

## Beispiel-Request (v2009 – 1 Transaktion)

```json
POST /api/generate-pain001
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-01",
  "version": "v2009",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957",
    "bic": "BANKCH22XXX"
  },
  "transactions": [
    {
      "sequenceNumber": 1,
      "amount": 1.00,
      "currency": "CHF",
      "creditorIban": "CH5604835012345678009",
      "creditorIid": "769",
      "creditor": {
        "name": "Empfänger GmbH",
        "postalAddress": {
          "streetName": "Hauptstrasse",
          "buildingNumber": "1",
          "postCode": "4001",
          "townName": "Basel",
          "country": "CH"
        }
      },
      "remittanceInfoStructured": "Zusatzinfo: QR-IBAN BANK, QR-Ref, CdtrAgt IID"
    }
  ]
}
```

## Beispiel-Request (v2009 – 5 Transaktionen)

```json
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-03",
  "version": "v2009",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957",
    "bic": "BANKCH22XXX"
  },
  "transactions": [
    { "sequenceNumber": 1, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 1" } },
    { "sequenceNumber": 2, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 2" } },
    { "sequenceNumber": 3, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 3" } },
    { "sequenceNumber": 4, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 4" } },
    { "sequenceNumber": 5, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 5" } }
  ]
}
```
> `NbOfTxs` (5) und `CtrlSum` (5.00) werden automatisch berechnet.

## Beispiel-Request (v2019 – simple Variante)

```json
POST /api/generate-pain001
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-01",
  "version": "v2019",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957"
  },
  "transactions": [
    {
      "sequenceNumber": 1,
      "amount": 1.00,
      "currency": "CHF",
      "creditorIban": "CH5604835012345678009",
      "creditor": {
        "name": "Empfänger GmbH"
      }
    }
  ]
}
```

## Beispiel-Request (v2019 – 1 Transaktion)

```json
POST /api/generate-pain001
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-01",
  "version": "v2019",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957",
    "bic": "BANKCH22XXX"
  },
  "transactions": [
    {
      "sequenceNumber": 1,
      "amount": 1.00,
      "currency": "CHF",
      "creditorIban": "CH5604835012345678009",
      "creditorIid": "769",
      "creditor": {
        "name": "Empfänger GmbH",
        "postalAddress": {
          "streetName": "Hauptstrasse",
          "buildingNumber": "1",
          "postCode": "4001",
          "townName": "Basel",
          "country": "CH"
        }
      },
      "remittanceInfoStructured": "Zusatzinfo: QR-IBAN BANK, QR-Ref, CdtrAgt IID"
    }
  ]
}
```
> Im generierten XML wird `<BIC>` durch `<BICFI>` ersetzt und `<ReqdExctnDt>` ist in `<Dt>` gewrappt.

## Beispiel-Request (v2019 – 5 Transaktionen)

```json
{
  "executionDate": "2025-09-29",
  "testRunId": "VERI-03",
  "version": "v2019",
  "debtor": {
    "name": "Muster AG",
    "iban": "CH9300762011623852957",
    "bic": "BANKCH22XXX"
  },
  "transactions": [
    { "sequenceNumber": 1, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 1" } },
    { "sequenceNumber": 2, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 2" } },
    { "sequenceNumber": 3, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 3" } },
    { "sequenceNumber": 4, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 4" } },
    { "sequenceNumber": 5, "amount": 1.00, "currency": "CHF", "creditorIban": "CH5604835012345678009", "creditor": { "name": "Empfänger 5" } }
  ]
}
```
> `NbOfTxs` (5) und `CtrlSum` (5.00) werden automatisch berechnet.

## Antwort

```
HTTP 200 OK
Content-Type: application/xml; charset=utf-8
Content-Disposition: attachment; filename="pain001_VERI-01_2025-09-29_v2009.xml"

<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd" ...>
  ...
</Document>
```

## Lokale Entwicklung

```bash
npm install
npm start        # Baut TypeScript und startet den Express-Server
npm test         # Jest-Tests
```

## Fehler-Antworten

| Status | Bedeutung |
|--------|-----------|
| `400` | Request body kein gültiges JSON |
| `422` | Validierungsfehler (Details im JSON-Body) |
| `500` | XML-Generierung intern fehlgeschlagen |
