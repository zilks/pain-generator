<script lang="ts">
  import Alert from './components/Alert.svelte';
  import ChipGroup from './components/ChipGroup.svelte';
  import Field from './components/Field.svelte';
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
  let showPreview = $state(false);

  const request = $derived(buildRequest(form));
  const preview = $derived(JSON.stringify(request, null, 2));

  function setVersion(v: Version) {
    form = withVersion(form, v);
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
        title: `${result.fileName} erstellt · ${form.transactions.length} Transaktion${form.transactions.length === 1 ? '' : 'en'} · ${formatAmount(totalAmount(form))}`,
        details: [],
      };
    } else {
      errors = errorsByField(result.details);
      alert = { kind: 'danger', title: result.title, details: result.details };
    }
  }
</script>

<div class="app">
  <header class="top">
    <div class="top__in">
      <div class="brand"><span class="brand__mark" aria-hidden="true">+</span>PAIN Generator</div>
      <nav>
        <span class="tag">Nur Testdaten</span>
        <a href="/api">API-Doku</a>
      </nav>
    </div>
  </header>

  <div class="main">
    <form class="form" onsubmit={(e) => { e.preventDefault(); submit(); }} novalidate>
      <div class="hero">
        <h1>PAIN.001 erstellen</h1>
        <p>Version wählen, Pflichtangaben ausfüllen und nur die Eigenschaften zuschalten, die der Testfall braucht.</p>
      </div>

      <section class="sec">
        <div class="sec__head"><h2 class="pg-section-title">Version</h2></div>
        <VersionSwitch value={form.version} onchange={setVersion} />
      </section>

      <section class="sec">
        <div class="sec__head"><h2 class="pg-section-title">Datei</h2></div>
        <div class="pg-grid">
          <Field id="testRunId" label="Testlauf-ID" bind:value={form.testRunId} required mono hint="Erscheint in allen IDs" error={errors['testRunId']} />
          <Field id="executionDate" label="Ausführungsdatum" bind:value={form.executionDate} required mono hint="YYYY-MM-DD" error={errors['executionDate']} />
        </div>
        <div class="pg-chipgroup" role="group" aria-label="Optionen">
          <span class="pg-label">Optionen</span>
          <ToggleChip label="Sammelbuchung" bind:pressed={form.options.batchBooking} />
          <ToggleChip label="Zufällige MsgId" bind:pressed={form.options.randomMsgId} />
          <ToggleChip label="Erstellungszeit festlegen" bind:pressed={form.options.creationDateTime} />
          <ToggleChip label="Abweichender Auftraggeber-Name" bind:pressed={form.options.initiatingPartyName} />
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
        <div class="pg-grid">
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

    <aside class="aside" aria-label="Request-Vorschau">
      <button type="button" class="aside__toggle pg-label" aria-expanded={showPreview} onclick={() => (showPreview = !showPreview)}>
        Request an POST /api/generate-pain001 <span aria-hidden="true">{showPreview ? '–' : '+'}</span>
      </button>
      <pre class:open={showPreview} data-testid="preview">{preview}</pre>
      <span class="note">Live-Vorschau. Nur zugeschaltete Eigenschaften werden gesendet.</span>
    </aside>
  </div>

  <footer class="foot">
    {#if alert}
      <div class="foot__alert"><Alert kind={alert.kind} title={alert.title} details={alert.details} /></div>
    {/if}
    <div class="foot__in">
      <div class="sum">
        <div><span class="pg-label">Transaktionen</span><b>{form.transactions.length}</b></div>
        <div><span class="pg-label">Kontrollsumme</span><b>{formatAmount(totalAmount(form))}</b></div>
        <div><span class="pg-label">Datei</span><b class="sum__file">{fileName(form)}</b></div>
      </div>
      <button type="button" class="pg-btn pg-btn--primary pg-btn--lg" disabled={busy} onclick={submit}>
        {busy ? 'Wird erstellt …' : 'XML erstellen'}
      </button>
    </div>
  </footer>
</div>

<style>
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .top { background: var(--ink); color: var(--on-ink); border-bottom: 4px solid var(--red); }
  .top__in { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-8); flex-wrap: wrap; }
  .brand { display: flex; align-items: center; gap: var(--space-3); font-weight: 800; font-size: 18px; letter-spacing: -0.01em; }
  .brand__mark { width: 22px; height: 22px; background: var(--red); border-radius: var(--radius-sm); display: grid; place-items: center; color: var(--on-red); font: 700 15px/1 var(--font-sans); }
  nav { display: flex; gap: var(--space-4); font-size: 14px; color: var(--muted-on-ink); align-items: center; }
  nav a { color: var(--on-ink); text-decoration: underline; text-decoration-color: var(--red-on-ink); text-underline-offset: 3px; }
  .tag { border: 1px solid var(--muted-on-ink); border-radius: var(--radius-sm); padding: 2px var(--space-2); font-size: 12px; }

  .main { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 380px; }
  .form { padding: var(--space-8); display: flex; flex-direction: column; gap: var(--space-8); min-width: 0; }
  .hero h1 { font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 var(--space-2); }
  .hero p { margin: 0; color: var(--ink-muted); max-width: 60ch; }
  .sec { display: flex; flex-direction: column; gap: var(--space-4); }
  .sec__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); border-bottom: 2px solid var(--ink); padding-bottom: var(--space-2); flex-wrap: wrap; }

  .aside { background: var(--ink); color: var(--on-ink); padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
  .aside__toggle { background: none; border: 0; padding: 0; text-align: left; color: var(--muted-on-ink); cursor: default; display: flex; justify-content: space-between; gap: var(--space-2); }
  .aside pre { margin: 0; flex: 1; overflow: auto; font: 400 12px/18px var(--font-mono); color: var(--on-ink); white-space: pre-wrap; overflow-wrap: anywhere; }
  .note { font-size: 13px; color: var(--muted-on-ink); }

  .foot { position: sticky; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); }
  .foot__alert { padding: var(--space-3) var(--space-8) 0; max-height: 30vh; overflow: auto; }
  .foot__in { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-8); flex-wrap: wrap; }
  .sum { display: flex; gap: var(--space-6); flex-wrap: wrap; }
  .sum div { display: flex; flex-direction: column; gap: 2px; }
  .sum b { font: 500 16px/22px var(--font-mono); font-variant-numeric: tabular-nums; }
  .sum .sum__file { font-size: 13px; overflow-wrap: anywhere; }

  @media (max-width: 900px) {
    .main { grid-template-columns: minmax(0, 1fr); }
    .form { padding: var(--space-4); }
    .top__in, .foot__in { padding-inline: var(--space-4); }
    .foot__alert { padding-inline: var(--space-4); }
    .hero h1 { font-size: 32px; line-height: 36px; }
    .aside__toggle { cursor: pointer; }
    .aside pre { display: none; max-height: 320px; }
    .aside pre.open { display: block; }
  }
</style>
