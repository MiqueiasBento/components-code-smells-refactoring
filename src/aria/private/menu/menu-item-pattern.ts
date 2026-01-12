/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed, signal} from '@angular/core';
import {SignalLike} from '../behaviors/signal-like/signal-like';
import {ListItem} from '../behaviors/list/list';
import {MenuItemInputs} from './menu-types';
import {MenuPattern} from './menu-pattern';

/** The menu item ui pattern class. */
export class MenuItemPattern<V> implements ListItem<V> {
  /** The value of the menu item. */
  value: SignalLike<V>;

  /** The unique ID of the menu item. */
  id: SignalLike<string>;

  /** Whether the menu item is disabled. */
  disabled = () => this.inputs.parent()?.disabled() || this.inputs.disabled();

  /** The search term for the menu item. */
  searchTerm: SignalLike<string>;

  /** The element of the menu item. */
  element: SignalLike<HTMLElement | undefined>;

  /** Whether the menu item is active. */
  active = computed(() => this.inputs.parent()?.inputs.activeItem() === this);

  /** Whether the menu item has received focus. */
  hasBeenFocused = signal(false);

  /** The tab index of the menu item. */
  tabIndex = computed(() => {
    if (this.submenu() && this.submenu()?.inputs.activeItem()) {
      return -1;
    }
    return this.inputs.parent()?.listBehavior.getItemTabindex(this) ?? -1;
  });

  /** The position of the menu item in the menu. */
  index = computed(() => this.inputs.parent()?.inputs.items().indexOf(this) ?? -1);

  /** Whether the menu item is expanded. */
  expanded = computed(() => (this.submenu() ? this._expanded() : null));

  /** Whether the menu item is expanded. */
  _expanded = signal(false);

  /** The ID of the menu that the menu item controls. */
  controls = signal<string | undefined>(undefined);

  /** The role of the menu item. */
  role = () => 'menuitem';

  /** Whether the menu item has a popup. */
  hasPopup = computed(() => !!this.submenu());

  /** The submenu associated with the menu item. */
  submenu: SignalLike<MenuPattern<V> | undefined>;

  /** Whether the menu item is selectable. */
  selectable: SignalLike<boolean>;

  constructor(readonly inputs: MenuItemInputs<V>) {
    this.id = inputs.id;
    this.value = inputs.value;
    this.element = inputs.element;
    this.submenu = this.inputs.submenu;
    this.searchTerm = inputs.searchTerm;
    this.selectable = computed(() => !this.submenu());
  }

  /** Opens the submenu. */
  open(opts?: {first?: boolean; last?: boolean}) {
    if (this.disabled()) {
      return;
    }

    this._expanded.set(true);

    if (opts?.first) {
      this.submenu()?.first();
    }
    if (opts?.last) {
      this.submenu()?.last();
    }
  }

  /** Closes the submenu. */
  close(opts: {refocus?: boolean} = {}) {
    this._expanded.set(false);

    if (opts.refocus) {
      this.inputs.parent()?.listBehavior.goto(this);
    }

    let menuitems = this.inputs.submenu()?.inputs.items() ?? [];

    while (menuitems.length) {
      const menuitem = menuitems.pop();
      menuitem?._expanded.set(false);
      menuitem?.inputs.parent()?.listBehavior.unfocus();
      menuitems = menuitems.concat(menuitem?.submenu()?.inputs.items() ?? []);

      const parent = menuitem?.inputs.parent();

      if (parent instanceof MenuPattern) {
        parent._clearTimeouts();
      }
    }
  }

  /** Handles focusin events for the menu item. */
  onFocusIn() {
    this.hasBeenFocused.set(true);
  }
}
