<script lang="ts">
  import type { Version } from '../lib/types';

  interface Props {
    value: Version;
    onchange: (v: Version) => void;
  }
  let { value, onchange }: Props = $props();

  const versions: { id: Version; schema: string }[] = [
    { id: 'v2009', schema: 'pain.001.001.03.ch.02' },
    { id: 'v2019', schema: 'pain.001.001.09.ch.03' },
  ];
</script>

<div class="pg-seg" role="group" aria-label="PAIN-Version">
  {#each versions as v (v.id)}
    <button type="button" aria-pressed={value === v.id} onclick={() => onchange(v.id)}>
      <b>{v.id}</b><small>{v.schema}</small>
    </button>
  {/each}
</div>
