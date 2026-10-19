<script lang="ts">
  interface Props {
    label: string;
    pressed: boolean;
  }
  let { label, pressed = $bindable() }: Props = $props();
</script>

<button type="button" class="pg-chip" aria-pressed={pressed} onclick={() => (pressed = !pressed)}>{label}</button>
