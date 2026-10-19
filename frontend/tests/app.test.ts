import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
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
});
