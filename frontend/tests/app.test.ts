import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.svelte';

let app: ReturnType<typeof mount> | undefined;

function render() {
  app = mount(App, { target: document.body });
  flushSync();
}
const click = (el: Element | null) => {
  (el as HTMLElement).click();
  flushSync();
};
const preview = () => JSON.parse(document.querySelector('[data-testid=preview]')!.textContent!);

afterEach(() => {
  if (app) unmount(app);
  document.body.innerHTML = '';
});

describe('App', () => {
  it('shows the logo in the header', () => {
    render();
    const logo = document.querySelector('.top .pg-logo')!;
    expect(logo.getAttribute('role')).toBe('img');
    expect(logo.getAttribute('aria-label')).toBe('PAIN Generator');
    expect(logo.querySelectorAll('svg rect')).toHaveLength(5);
  });

  it('starts with v2009 and the required fields only', () => {
    render();
    expect(document.querySelector('.pg-seg [aria-pressed=true]')!.textContent).toContain('v2009');
    expect(preview().transactions[0]).not.toHaveProperty('creditor.postalAddress');
    expect(document.querySelector('#tx0-street')).toBeNull();
  });

  it('chips switch fields on and off and change the request', () => {
    render();
    const chip = (name: string) => [...document.querySelectorAll('.pg-chip')].find((c) => c.textContent === name);
    click(chip('Strukturiert')!);
    expect(document.querySelector('#tx0-street')).not.toBeNull();
    expect(preview().transactions[0].creditor.postalAddress.country).toBe('CH');
    click(chip('Keine')!);
    expect(document.querySelector('#tx0-street')).toBeNull();
    expect(preview().transactions[0].creditor).not.toHaveProperty('postalAddress');
  });

  it('v2019 disables the unstructured address', () => {
    render();
    click([...document.querySelectorAll('.pg-seg button')].find((b) => b.textContent!.includes('v2019'))!);
    expect(preview().version).toBe('v2019');
    const unstructured = [...document.querySelectorAll('.pg-chip')].find((c) => c.textContent === 'Unstrukturiert') as HTMLButtonElement;
    expect(unstructured.disabled).toBe(true);
  });

  it('adds and removes transactions', () => {
    render();
    click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Transaktion hinzufügen')!);
    expect(preview().transactions).toHaveLength(2);
    click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Transaktion entfernen')!);
    expect(preview().transactions).toHaveLength(1);
  });

  it('switches between form and preview tabs', () => {
    render();
    const form = document.querySelector('#panel-form')!;
    const output = document.querySelector('#panel-output')!;
    const tabForm = document.querySelector('#tab-form')!;
    const tabOutput = document.querySelector('#tab-output')!;
    expect(tabForm.getAttribute('aria-selected')).toBe('true');
    expect(form.classList.contains('is-hidden')).toBe(false);
    click(tabOutput);
    expect(tabOutput.getAttribute('aria-selected')).toBe('true');
    expect(tabForm.getAttribute('aria-selected')).toBe('false');
    expect(form.classList.contains('is-hidden')).toBe(true);
    expect(output.classList.contains('is-active')).toBe(true);
    click(tabForm);
    expect(form.classList.contains('is-hidden')).toBe(false);
  });

  it('shows count and checksum on the submit button', () => {
    render();
    const meta = () => document.querySelector('.act__meta')!.textContent;
    expect(meta()).toBe('1 Tx · 1.00');
    click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Transaktion hinzufügen')!);
    expect(meta()).toBe('2 Tx · 1.00');
  });

  it('copies the request preview', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render();
    const copy = document.querySelector('.copy') as HTMLButtonElement;
    copy.click();
    expect(writeText).toHaveBeenCalledWith(document.querySelector('[data-testid=preview]')!.textContent);
    await vi.waitFor(() => expect(copy.textContent).toBe('Kopiert'));
  });
});
