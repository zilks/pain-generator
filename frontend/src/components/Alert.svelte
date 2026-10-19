<script lang="ts">
  interface Props {
    kind: 'danger' | 'success';
    title: string;
    details?: string[];
  }
  let { kind, title, details = [] }: Props = $props();
</script>

<div class="pg-alert pg-alert--{kind}" role={kind === 'danger' ? 'alert' : 'status'}>
  <span class="pg-alert__glyph" aria-hidden="true">{kind === 'danger' ? '!' : '✓'}</span>
  <p class="pg-alert__title">{title}</p>
  {#if details.length}
    <ul>
      {#each details as d}<li>{d}</li>{/each}
    </ul>
  {/if}
</div>
