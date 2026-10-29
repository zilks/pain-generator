<script lang="ts" generics="T extends string">
  import type { ChipOption } from '../lib/types';

  interface Props {
    label: string;
    options: ChipOption<T>[];
    value: T;
  }
  let { label, options, value = $bindable() }: Props = $props();
</script>

<!-- Einzelwahl: eine Option ist immer aktiv -->
<div class="pg-chipgroup" role="radiogroup" aria-label={label}>
  <span class="pg-label">{label}</span>
  <div class="pg-chipgroup__opts">
    {#each options as o (o.value)}
      <button
        type="button"
        class="pg-chip"
        role="radio"
        aria-checked={value === o.value}
        disabled={o.disabled}
        title={o.title}
        onclick={() => (value = o.value)}
      >{o.label}</button>
    {/each}
  </div>
</div>
