/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed, signal} from '@angular/core';
import {KeyboardEventManager} from '../behaviors/event-manager';
import {List} from '../behaviors/list/list';
import {MenuBarInputs} from './menu-types';
import {MenuItemPattern} from './menu-item-pattern';

/** The menubar ui pattern class. */
export class MenuBarPattern<V> {
  /** Controls list behavior for the menu items. */
  listBehavior: List<MenuItemPattern<V>, V>;

  /** The tab index of the menu. */
  tabIndex = () => this.listBehavior.tabIndex();

  /** The key used to navigate to the next item. */
  private _nextKey = computed(() => {
    return this.inputs.textDirection() === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  });

  /** The key used to navigate to the previous item. */
  private _previousKey = computed(() => {
    return this.inputs.textDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  });

  /** Represents the space key. Does nothing when the user is actively using typeahead. */
  dynamicSpaceKey = computed(() => (this.listBehavior.isTyping() ? '' : ' '));

  /** The regexp used to decide if a key should trigger typeahead. */
  typeaheadRegexp = /^.$/;

  /** Whether the menubar or any of its children are currently focused. */
  isFocused = signal(false);

  /** Whether the menubar has been focused. */
  hasBeenFocused = signal(false);

  /** Whether the menubar is disabled. */
  disabled = () => this.inputs.disabled();

  /** Handles keyboard events for the menu. */
  keydownManager = computed(() => {
    return new KeyboardEventManager()
      .on(this._nextKey, () => this.next())
      .on(this._previousKey, () => this.prev())
      .on('End', () => this.listBehavior.last())
      .on('Home', () => this.listBehavior.first())
      .on('Enter', () => this.inputs.activeItem()?.open({first: true}))
      .on('ArrowUp', () => this.inputs.activeItem()?.open({last: true}))
      .on('ArrowDown', () => this.inputs.activeItem()?.open({first: true}))
      .on(this.dynamicSpaceKey, () => this.inputs.activeItem()?.open({first: true}))
      .on(this.typeaheadRegexp, e => this.listBehavior.search(e.key));
  });

  constructor(readonly inputs: MenuBarInputs<V>) {
    this.listBehavior = new List<MenuItemPattern<V>, V>(inputs);
  }

  /** Sets the default state for the menubar. */
  setDefaultState() {
    this.inputs.activeItem.set(this.inputs.items()[0]);
  }

  /** Handles keyboard events for the menu. */
  onKeydown(event: KeyboardEvent) {
    this.keydownManager().handle(event);
  }

  /** Handles click events for the menu bar. */
  onClick(event: MouseEvent) {
    const item = this.inputs.items().find(i => i.element()?.contains(event.target as Node));

    if (!item) {
      return;
    }

    this.goto(item);
    item.expanded() ? item.close() : item.open();
  }

  /** Handles mouseover events for the menu bar. */
  onMouseOver(event: MouseEvent) {
    const item = this.inputs.items().find(i => i.element()?.contains(event.target as Node));

    if (item) {
      this.goto(item, {focusElement: this.isFocused()});
    }
  }

  /** Handles focusin events for the menu bar. */
  onFocusIn() {
    this.isFocused.set(true);
    this.hasBeenFocused.set(true);
  }

  /** Handles focusout events for the menu bar. */
  onFocusOut(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as Node | null;

    if (!this.inputs.element()?.contains(relatedTarget)) {
      this.isFocused.set(false);
      this.close();
    }
  }

  /** Goes to and optionally focuses the specified menu item. */
  goto(item: MenuItemPattern<V>, opts?: {focusElement?: boolean}) {
    const prevItem = this.inputs.activeItem();
    this.listBehavior.goto(item, opts);

    if (prevItem?.expanded()) {
      prevItem?.close();
      this.inputs.activeItem()?.open();
    }

    if (item === prevItem) {
      if (item.expanded() && item.submenu()?.inputs.activeItem()) {
        item.submenu()?.inputs.activeItem()?.close();
        item.submenu()?.listBehavior.unfocus();
      }
    }
  }

  /** Focuses the next menu item. */
  next() {
    const prevItem = this.inputs.activeItem();
    this.listBehavior.next();

    if (prevItem?.expanded()) {
      prevItem?.close();
      this.inputs.activeItem()?.open({first: true});
    }
  }

  /** Focuses the previous menu item. */
  prev() {
    const prevItem = this.inputs.activeItem();
    this.listBehavior.prev();

    if (prevItem?.expanded()) {
      prevItem?.close();
      this.inputs.activeItem()?.open({first: true});
    }
  }

  /** Closes the menubar and refocuses the root menu bar item. */
  close() {
    this.inputs.activeItem()?.close({refocus: this.isFocused()});
  }
}
