# PAIN.001 Generator – Express Backend

[![CI / CD](https://github.com/zilks/pain-generator/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zilks/pain-generator/actions/workflows/ci-cd.yml)

Express-Backend (TypeScript) zur Generierung von PAIN.001-XML-Dateien nach Schweizer SIX-Standard.

## Unterstützte Versionen

| Version | Schema | Namespace |
|---------|--------|-----------|
| `v2009` | `pain.001.001.03.ch.02.xsd` | `http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd` |
| `v2019` | `pain.001.001.09.ch.03.xsd` | `http://www.six-interbank-clearing.com/de/pain.001.001.09.ch.03.xsd` |

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
