/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed, signal} from '@angular/core';
import {KeyboardEventManager} from '../behaviors/event-manager';
import {SignalLike} from '../behaviors/signal-like/signal-like';
import {MenuTriggerInputs} from './menu-types';
import {MenuPattern} from './menu-pattern';

/** The menu trigger ui pattern class. */
export class MenuTriggerPattern<V> {
  /** Whether the menu is expanded. */
  expanded = signal(false);

  /** Whether the menu trigger has received focus. */
  hasBeenFocused = signal(false);

  /** The role of the menu trigger. */
  role = () => 'button';

  /** Whether the menu trigger has a popup. */
  hasPopup = () => true;

  /** The menu associated with the trigger. */
  menu: SignalLike<MenuPattern<V> | undefined>;

  /** The tab index of the menu trigger. */
  tabIndex = computed(() => (this.expanded() && this.menu()?.inputs.activeItem() ? -1 : 0));

  /** Whether the menu trigger is disabled. */
  disabled = () => this.inputs.disabled();

  /** Handles keyboard events for the menu trigger. */
  keydownManager = computed(() => {
    return new KeyboardEventManager()
      .on(' ', () => this.open({first: true}))
      .on('Enter', () => this.open({first: true}))
      .on('ArrowDown', () => this.open({first: true}))
      .on('ArrowUp', () => this.open({last: true}))
      .on('Escape', () => this.close({refocus: true}));
  });

  constructor(readonly inputs: MenuTriggerInputs<V>) {
    this.menu = this.inputs.menu;
  }

  /** Handles keyboard events for the menu trigger. */
  onKeydown(event: KeyboardEvent) {
    if (!this.inputs.disabled()) {
      this.keydownManager().handle(event);
    }
  }

  /** Handles click events for the menu trigger. */
  onClick() {
    if (!this.inputs.disabled()) {
      this.expanded() ? this.close() : this.open({first: true});
    }
  }

  /** Handles focusin events for the menu trigger. */
  onFocusIn() {
    this.hasBeenFocused.set(true);
  }

  /** Handles focusout events for the menu trigger. */
  onFocusOut(event: FocusEvent) {
    const element = this.inputs.element();
    const relatedTarget = event.relatedTarget as Node | null;

    if (
      this.expanded() &&
      !element?.contains(relatedTarget) &&
      !this.inputs.menu()?.inputs.element()?.contains(relatedTarget)
    ) {
      this.close();
    }
  }

  /** Opens the menu. */
  open(opts?: {first?: boolean; last?: boolean}) {
    this.expanded.set(true);

    if (opts?.first) {
      this.inputs.menu()?.first();
    } else if (opts?.last) {
      this.inputs.menu()?.last();
    }
  }

  /** Closes the menu. */
  close(opts: {refocus?: boolean} = {}) {
    this.expanded.set(false);
    this.menu()?.listBehavior.unfocus();

    if (opts.refocus) {
      this.inputs.element()?.focus();
    }

    let menuitems = this.inputs.menu()?.inputs.items() ?? [];

    while (menuitems.length) {
      const menuitem = menuitems.pop();
      menuitem?._expanded.set(false);
      menuitem?.inputs.parent()?.listBehavior.unfocus();
      menuitems = menuitems.concat(menuitem?.submenu()?.inputs.items() ?? []);
    }
  }
}
