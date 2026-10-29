<script lang="ts">
  import Alert from './components/Alert.svelte';
  import ChipGroup from './components/ChipGroup.svelte';
  import Field from './components/Field.svelte';
  import Logo from './components/Logo.svelte';
  import ToggleChip from './components/ToggleChip.svelte';
  import TransactionCard from './components/TransactionCard.svelte';
  import VersionSwitch from './components/VersionSwitch.svelte';
  import { download, generate } from './lib/api';
  import { errorsByField } from './lib/errors';
  import { emptyTransaction, fileName, formatAmount, initialState, totalAmount, withVersion } from './lib/form';
  import { buildRequest } from './lib/request';
  import type { Version } from './lib/types';

  let form = $state(initialState());
  let busy = $state(false);
  let errors = $state<Record<string, string>>({});
  let alert = $state<{ kind: 'danger' | 'success'; title: string; details: string[] } | null>(null);
  let view = $state<'form' | 'output'>('form');
  let copied = $state(false);

  const request = $derived(buildRequest(form));
  const preview = $derived(JSON.stringify(request, null, 2));
  const count = $derived(form.transactions.length);
  const total = $derived(formatAmount(totalAmount(form)));

  function setVersion(v: Version) {
    form = withVersion(form, v);
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(preview);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  async function submit() {
    busy = true;
    alert = null;
    errors = {};
    const result = await generate(request);
    busy = false;
    if (result.ok) {
      download(result.xml, result.fileName);
      alert = {
        kind: 'success',
        title: `${result.fileName} erstellt · ${count} Transaktion${count === 1 ? '' : 'en'} · ${total}`,
        details: [],
      };
    } else {
      errors = errorsByField(result.details);
      alert = { kind: 'danger', title: result.title, details: result.details };
      // Mobil: zurück zum Formular, damit die markierten Felder sichtbar sind
      view = 'form';
    }
  }
</script>

<div class="app">
  <header class="top">
    <div class="top__in">
      <Logo />
      <nav>
        <span class="tag"><span class="wide">Nur</span> Testdaten</span>
        <a href="/api">API<span class="wide">-Doku</span></a>
      </nav>
    </div>
  </header>

  <!-- Nur mobil sichtbar: Formular und Ausgabe als Tabs -->
  <div class="tabs" role="tablist" aria-label="Ansicht">
    <button type="button" role="tab" id="tab-form" aria-controls="panel-form" aria-selected={view === 'form'} onclick={() => (view = 'form')}>Formular</button>
    <button type="button" role="tab" id="tab-output" aria-controls="panel-output" aria-selected={view === 'output'} onclick={() => (view = 'output')}><span class="pg-mono" aria-hidden="true">{'{ }'}</span>Vorschau</button>
  </div>

  <div class="main">
    <form id="panel-form" class="form" class:is-hidden={view !== 'form'} onsubmit={(e) => { e.preventDefault(); submit(); }} novalidate>
      <div class="hero">
        <div>
          <h1>PAIN.001 erstellen</h1>
          <p>Version wählen, Pflichtangaben ausfüllen und nur die Eigenschaften zuschalten, die der Testfall braucht.</p>
        </div>
        <VersionSwitch value={form.version} onchange={setVersion} />
      </div>

      <section class="sec">
        <div class="sec__head"><h2 class="pg-section-title">Datei</h2></div>
        <div class="pg-grid">
          <Field id="testRunId" label="Testlauf-ID" bind:value={form.testRunId} required mono hint="Erscheint in allen IDs" error={errors['testRunId']} />
          <Field id="executionDate" label="Ausführungsdatum" bind:value={form.executionDate} required mono hint="YYYY-MM-DD" error={errors['executionDate']} />
        </div>
        <div class="pg-chipgroup" role="group" aria-label="Optionen">
          <span class="pg-label">Optionen</span>
          <div class="pg-chipgroup__opts">
            <ToggleChip label="Sammelbuchung" bind:pressed={form.options.batchBooking} />
            <ToggleChip label="Zufällige MsgId" bind:pressed={form.options.randomMsgId} />
            <ToggleChip label="Erstellungszeit festlegen" bind:pressed={form.options.creationDateTime} />
            <ToggleChip label="Abweichender Auftraggeber-Name" bind:pressed={form.options.initiatingPartyName} />
          </div>
        </div>
        {#if form.options.creationDateTime || form.options.initiatingPartyName}
          <div class="pg-grid">
            {#if form.options.creationDateTime}
              <Field id="creationDateTime" label="Erstellungszeit" bind:value={form.creationDateTime} mono hint="YYYY-MM-DDTHH:MM:SS" error={errors['creationDateTime']} />
            {/if}
            {#if form.options.initiatingPartyName}
              <Field id="initiatingPartyName" label="Auftraggeber-Name" bind:value={form.initiatingPartyName} />
            {/if}
          </div>
        {/if}
      </section>

      <section class="sec">
        <div class="sec__head"><h2 class="pg-section-title">Auftraggeber</h2></div>
        <div class="pg-grid pg-grid--name-iban">
          <Field id="debtor-name" label="Name" bind:value={form.debtor.name} required error={errors['debtor.name']} />
          <Field id="debtor-iban" label="IBAN" bind:value={form.debtor.iban} required mono error={errors['debtor.iban']} />
        </div>
        <ChipGroup
          label="Institut"
          bind:value={form.debtor.agent}
          options={[
            { value: 'none', label: 'Keins' },
            { value: 'bic', label: 'BIC' },
            { value: 'iid', label: 'IID' },
          ]}
        />
        {#if form.debtor.agent === 'bic'}
          <div class="pg-grid"><Field id="debtor-bic" label="BIC" bind:value={form.debtor.bic} mono /></div>
        {:else if form.debtor.agent === 'iid'}
          <div class="pg-grid"><Field id="debtor-iid" label="IID (Clearing-Nr.)" bind:value={form.debtor.iid} mono /></div>
        {/if}
      </section>

      <section class="sec">
        <div class="sec__head">
          <h2 class="pg-section-title">Transaktionen</h2>
          <button type="button" class="pg-btn pg-btn--secondary" onclick={() => form.transactions.push(emptyTransaction())}>Transaktion hinzufügen</button>
        </div>
        <div class="pg-stack">
          {#each form.transactions as _, i (i)}
            <TransactionCard
              bind:tx={form.transactions[i]}
              index={i}
              version={form.version}
              {errors}
              removable={form.transactions.length > 1}
              onremove={() => form.transactions.splice(i, 1)}
            />
          {/each}
        </div>
      </section>
    </form>

    <aside id="panel-output" class="out" class:is-active={view === 'output'} aria-label="Ausgabe">
      <div class="out__head">
        <span class="pg-label out__title">Ausgabe</span>
        <div class="sum">
          <div><span class="pg-label">Transaktionen</span><b>{count}</b></div>
          <div><span class="pg-label">Kontrollsumme</span><b>{total}</b></div>
          <div class="sum__wide"><span class="pg-label">Datei</span><b class="sum__file">{fileName(form)}</b></div>
        </div>
        <div class="act">
          {#if alert}
            <div class="act__alert"><Alert kind={alert.kind} title={alert.title} details={alert.details} /></div>
          {/if}
          <button type="button" class="pg-btn pg-btn--primary pg-btn--lg act__btn" disabled={busy} onclick={submit}>
            <span>{busy ? 'Wird erstellt …' : 'XML erstellen'}</span>
            <span class="act__meta pg-mono" aria-hidden="true">{count} Tx · {total}</span>
          </button>
        </div>
      </div>
      <div class="out__preview">
        <div class="out__bar">
          <span class="pg-mono">POST /api/generate-pain001</span>
          <button type="button" class="copy" onclick={copyPreview}>{copied ? 'Kopiert' : 'Kopieren'}</button>
        </div>
        <pre data-testid="preview">{preview}</pre>
        <span class="note">Live-Vorschau. Nur zugeschaltete Eigenschaften werden gesendet.</span>
      </div>
    </aside>
  </div>
</div>

<style>
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .top { background: var(--ink); color: var(--on-ink); border-bottom: 4px solid var(--red); }
  .top__in { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-8); }
  nav { display: flex; gap: var(--space-4); font-size: 14px; color: var(--muted-on-ink); align-items: center; white-space: nowrap; }
  nav a { color: var(--on-ink); text-decoration: underline; text-decoration-color: var(--red-on-ink); text-underline-offset: 3px; }
  .tag { border: 1px solid var(--muted-on-ink); border-radius: var(--radius-sm); padding: 2px var(--space-2); font-size: 12px; }

  .tabs { display: none; }

  .main { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 460px; }
  .form { padding: var(--space-8) var(--space-12); display: flex; flex-direction: column; gap: var(--space-8); min-width: 0; width: 100%; max-width: 1040px; justify-self: center; }
  .hero { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-4) var(--space-6); flex-wrap: wrap; }
  .hero h1 { font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 var(--space-2); }
  .hero p { margin: 0; color: var(--ink-muted); max-width: 52ch; }
  .sec { display: flex; flex-direction: column; gap: var(--space-4); }
  .sec__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); border-bottom: 2px solid var(--ink); padding-bottom: var(--space-2); flex-wrap: wrap; }

  /* Ausgabe-Panel: Kennzahlen, Hauptaktion und Request-Vorschau */
  .out { position: sticky; top: 0; align-self: start; height: 100vh; background: var(--ink); color: var(--on-ink); display: flex; flex-direction: column; min-width: 0; }
  .out__head { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); border-bottom: 1px solid var(--ink-muted); }
  .out .pg-label { color: var(--muted-on-ink); }
  .sum { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3) var(--space-4); }
  .sum div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sum__wide { grid-column: 1 / -1; }
  .sum b { font: 500 22px/28px var(--font-mono); font-variant-numeric: tabular-nums; }
  .sum .sum__file { font-size: 13px; line-height: 18px; font-weight: 400; overflow-wrap: anywhere; }
  .act { display: flex; flex-direction: column; gap: var(--space-3); }
  .act__alert { max-height: 30vh; overflow: auto; border-radius: var(--radius-md); background: var(--surface); color: var(--ink); }
  .act__btn { width: 100%; justify-content: center; }
  .act__meta { display: none; font-size: 13px; font-weight: 400; }
  .out__preview { flex: 1; display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-6) var(--space-6); min-height: 0; }
  .out__bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: 12px; color: var(--muted-on-ink); }
  .copy { height: 32px; padding: 0 var(--space-3); border: 1px solid var(--muted-on-ink); border-radius: var(--radius-sm); background: transparent; color: var(--on-ink); font: 600 13px/1 var(--font-sans); cursor: pointer; }
  .copy:focus-visible { outline: 2px solid var(--red-on-ink); outline-offset: 2px; }
  .out pre { margin: 0; flex: 1; overflow: auto; font: 400 12px/18px var(--font-mono); color: var(--on-ink); white-space: pre-wrap; overflow-wrap: anywhere; }
  .note { font-size: 13px; color: var(--muted-on-ink); }

  @media (max-width: 1100px) {
    .main { grid-template-columns: minmax(0, 1fr) 380px; }
    .form { padding: var(--space-8); }
  }

  /* Mobil: Tabs Formular | Vorschau, Hauptaktion fix unten */
  @media (max-width: 900px) {
    .top__in { padding: var(--space-3) var(--space-4); gap: var(--space-3); }
    .tabs { display: flex; position: sticky; top: 0; z-index: 2; background: var(--surface); border-bottom: 1px solid var(--line); }
    .tabs button { flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; gap: var(--space-2); border: 0; border-bottom: 3px solid transparent; background: transparent; color: var(--ink-muted); font: 600 15px/1 var(--font-sans); cursor: pointer; }
    .tabs button[aria-selected='true'] { color: var(--ink); border-bottom-color: var(--red); }
    .tabs button:focus-visible { outline: 2px solid var(--focus); outline-offset: -4px; }
    .tabs .pg-mono { font-size: 13px; }

    .main { grid-template-columns: minmax(0, 1fr); padding-bottom: 96px; }
    .form { padding: var(--space-6) var(--space-4); gap: var(--space-6); }
    .form.is-hidden { display: none; }
    .hero h1 { font-size: 30px; line-height: 34px; }
    .hero :global(.pg-seg) { width: 100%; }

    .out { position: static; height: auto; background: transparent; color: var(--ink); padding: var(--space-4); gap: var(--space-4); }
    .out:not(.is-active) { padding: 0; }
    .out:not(.is-active) .sum, .out:not(.is-active) .out__preview { display: none; }
    .out__head { padding: 0; border: 0; }
    .out__title { display: none; }
    .out .pg-label { color: var(--ink-muted); }
    .sum { padding: var(--space-3); background: var(--surface-sunken); border: 1px solid var(--line); border-radius: var(--radius-md); }
    .sum b { font-size: 16px; line-height: 22px; }

    .act { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; padding: var(--space-3) var(--space-4) var(--space-4); background: var(--surface); border-top: 1px solid var(--line); }
    .act__btn { height: 56px; justify-content: space-between; }
    .act__meta { display: inline; }

    .out__preview { background: var(--ink); color: var(--on-ink); border-radius: var(--radius-md); padding: var(--space-3); min-height: 60vh; }
    .out__preview .copy { height: 40px; }
  }

  @media (max-width: 600px) {
    .wide { display: none; }
  }
</style>
