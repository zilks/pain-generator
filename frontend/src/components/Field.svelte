<script lang="ts">
  interface Props {
    id: string;
    label: string;
    value: string;
    required?: boolean;
    mono?: boolean;
    hint?: string;
    error?: string;
  }
  let { id, label, value = $bindable(), required = false, mono = false, hint, error }: Props = $props();
</script>

<div class="pg-field" class:is-invalid={!!error}>
  <label for={id}>{label}{#if required}<span class="req" aria-hidden="true">*</span>{/if}</label>
  <input
    class="pg-input"
    class:pg-mono={mono}
    {id}
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error || hint ? `${id}-hint` : undefined}
  />
  {#if error}
    <span class="pg-hint" id="{id}-hint">{error}</span>
  {:else if hint}
    <span class="pg-hint" id="{id}-hint">{hint}</span>
  {/if}
</div>
