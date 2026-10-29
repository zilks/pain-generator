<script lang="ts">
  import ChipGroup from './ChipGroup.svelte';
  import Field from './Field.svelte';
  import { formatAmount, parseAmount } from '../lib/form';
  import type { TransactionForm, Version } from '../lib/types';

  interface Props {
    tx: TransactionForm;
    index: number;
    version: Version;
    errors: Record<string, string>;
    removable: boolean;
    onremove: () => void;
  }
  let { tx = $bindable(), index, version, errors, removable, onremove }: Props = $props();

  const id = (f: string) => `tx${index}-${f}`;
  const err = (f: string) => errors[`tx.${index}.${f}`];
</script>

<article class="pg-card">
  <div class="pg-card__head">
    <h3 class="pg-card__title">Transaktion {index + 1}</h3>
    <span class="pg-card__meta">{tx.currency} {formatAmount(parseAmount(tx.amount))}</span>
  </div>

  <div class="pg-grid pg-grid--tx">
    <Field id={id('creditor')} label="Empfänger" bind:value={tx.creditor} required error={err('creditor')} />
    <Field id={id('iban')} label="IBAN" bind:value={tx.iban} required mono error={err('iban')} />
    <Field id={id('amount')} label="Betrag" bind:value={tx.amount} required mono error={err('amount')} />
    <Field id={id('currency')} label="Währung" bind:value={tx.currency} required mono error={err('currency')} />
  </div>

  <ChipGroup
    label="Adresse"
    bind:value={tx.address}
    options={[
      { value: 'none', label: 'Keine' },
      { value: 'structured', label: 'Strukturiert' },
      { value: 'unstructured', label: 'Unstrukturiert', disabled: version === 'v2019', title: version === 'v2019' ? 'In v2019 nicht erlaubt' : undefined },
    ]}
  />
  {#if tx.address === 'structured'}
    <div class="pg-grid">
      <Field id={id('street')} label="Strasse" bind:value={tx.street} error={err('street')} />
      <Field id={id('nr')} label="Nr." bind:value={tx.buildingNumber} />
      <Field id={id('postCode')} label="PLZ" bind:value={tx.postCode} mono error={err('postCode')} />
      <Field id={id('town')} label="Ort" bind:value={tx.town} error={err('town')} />
      <Field id={id('country')} label="Land" bind:value={tx.country} mono hint="ISO-Code, z. B. CH" error={err('country')} />
    </div>
  {:else if tx.address === 'unstructured'}
    <div class="pg-grid">
      <Field id={id('line1')} label="Adresszeile 1" bind:value={tx.line1} />
      <Field id={id('line2')} label="Adresszeile 2" bind:value={tx.line2} />
      <Field id={id('country')} label="Land" bind:value={tx.country} mono hint="ISO-Code, z. B. CH" error={err('country')} />
    </div>
  {/if}

  <ChipGroup
    label="Institut"
    bind:value={tx.agent}
    options={[
      { value: 'none', label: 'Keins' },
      { value: 'bic', label: 'BIC' },
      { value: 'iid', label: 'IID' },
    ]}
  />
  {#if tx.agent === 'bic'}
    <div class="pg-grid"><Field id={id('bic')} label="BIC" bind:value={tx.bic} mono /></div>
  {:else if tx.agent === 'iid'}
    <div class="pg-grid"><Field id={id('iid')} label="IID (Clearing-Nr.)" bind:value={tx.iid} mono /></div>
  {/if}

  <ChipGroup
    label="Verwendungszweck"
    bind:value={tx.remittance}
    options={[
      { value: 'none', label: 'Keiner' },
      { value: 'unstructured', label: 'Unstrukturiert' },
      { value: 'structured', label: 'Strukturiert' },
    ]}
  />
  {#if tx.remittance !== 'none'}
    <div class="pg-grid">
      <Field id={id('remittance')} label={tx.remittance === 'unstructured' ? 'Freitext' : 'Zusatzinfo (AddtlRmtInf)'} bind:value={tx.remittanceText} />
    </div>
  {/if}

  {#if removable}
    <div class="pg-row" style="justify-content: flex-end">
      <button type="button" class="pg-btn pg-btn--ghost" onclick={onremove}>Transaktion entfernen</button>
    </div>
  {/if}
</article>
