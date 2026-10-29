<script lang="ts">
  // Logo «Struktur»: roter Balken (Zahlungsgruppe) mit eingerückten Zeilen (Transaktionen).
  // Die Zeilen nehmen currentColor an, damit das Symbol auf hellem und dunklem Grund funktioniert.
  let { size = 26, wordmark = true }: { size?: number; wordmark?: boolean } = $props();
</script>

<span class="pg-logo" role="img" aria-label="PAIN Generator">
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="6" width="40" height="9" rx="2" fill="var(--red)" />
    <rect x="4" y="15" width="4" height="27" fill="currentColor" />
    <rect x="12" y="19" width="32" height="6" rx="1.5" fill="currentColor" />
    <rect x="12" y="28" width="24" height="6" rx="1.5" fill="currentColor" />
    <rect x="12" y="37" width="28" height="6" rx="1.5" fill="currentColor" />
  </svg>
  {#if wordmark}
    <span class="pg-logo__word" aria-hidden="true"><b>PAIN</b><small>Generator</small></span>
  {/if}
</span>
