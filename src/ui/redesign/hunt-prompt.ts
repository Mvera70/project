import './hunt-prompt.css';
import { renderUiText } from '@engine/chronicle/render';
import { retireOverlay } from '../motion';

export type HuntSpecies = 'partridge' | 'rabbit' | 'deer' | 'boar' | 'bear';
export type HuntWeapon = 'sling' | 'bow' | 'spear';

let dismissCurrent: (() => void) | null = null;

/** Presenta una oferta de caza; el jugador elige el arma o cancela. */
export function showHuntPrompt(
  offer: { species: HuntSpecies; weapons: readonly HuntWeapon[] },
  onChoose: (weapon: HuntWeapon) => void,
  onDismiss?: () => void,
): () => void {
  dismissCurrent?.();

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const backdrop = document.createElement('div');
  backdrop.className = 'hunt-prompt-backdrop';
  const dialog = document.createElement('section');
  dialog.className = 'hunt-prompt';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'hunt-prompt-title');
  dialog.setAttribute('aria-describedby', 'hunt-prompt-description');

  const title = document.createElement('h2');
  title.id = 'hunt-prompt-title';
  title.textContent = renderUiText('hunt.prompt.title');
  const description = document.createElement('p');
  description.id = 'hunt-prompt-description';
  description.textContent = renderUiText('hunt.prompt.description', {
    species: renderUiText(`hunt.species.${offer.species}`),
  });

  const choices = document.createElement('div');
  choices.className = 'hunt-prompt-choices';
  const buttons: HTMLButtonElement[] = [];
  for (const weapon of offer.weapons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hunt-prompt-weapon';
    button.textContent = renderUiText(`hunt.weapon.${weapon}`);
    button.addEventListener('click', () => {
      cleanup();
      onChoose(weapon);
    });
    buttons.push(button);
    choices.append(button);
  }

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'hunt-prompt-cancel';
  cancel.textContent = renderUiText('hunt.prompt.cancel');
  cancel.addEventListener('click', () => {
    cleanup();
    onDismiss?.();
  });
  dialog.append(title, description, choices, cancel);
  backdrop.append(dialog);
  document.body.append(backdrop);

  let active = true;
  const cleanup = (): void => {
    if (!active) return;
    active = false;
    document.removeEventListener('keydown', onKeyDown);
    retireOverlay(backdrop, dialog);
    if (dismissCurrent === cleanup) dismissCurrent = null;
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cleanup();
      onDismiss?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  dismissCurrent = cleanup;
  (buttons[0] ?? cancel).focus();
  return cleanup;
}
