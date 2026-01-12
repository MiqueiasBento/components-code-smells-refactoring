/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed, Signal, signal, signal as signalFn} from '@angular/core';
import {KeyboardEventManager} from '../behaviors/event-manager';
import {List} from '../behaviors/list/list';
import {SignalLike} from '../behaviors/signal-like/signal-like';
import {MenuBarPattern} from './menu-bar-pattern';
import {MenuItemPattern} from './menu-item-pattern';
import {MenuTriggerPattern} from './menu-trigger-pattern';
import {MenuInputs} from './menu-types';

/** The menu ui pattern class. */
export class MenuPattern<V> {
  /** The unique ID of the menu. */
  id: SignalLike<string>;

  /** The role of the menu. */
  role = () => 'menu';

  /** Whether the menu is disabled. */
  disabled = () => this.inputs.disabled();

  /** Whether the menu is visible. */
  visible = computed(() => (this.inputs.parent() ? !!this.inputs.parent()?.expanded() : true));

  /** Controls list behavior for the menu items. */
  listBehavior: List<MenuItemPattern<V>, V>;

  /** Whether the menu or any of its child elements are currently focused. */
  isFocused = signal(false);

  /** Whether the menu has received focus. */
  hasBeenFocused = signal(false);

  /** Whether the menu trigger has been hovered. */
  hasBeenHovered = signal(false);

  /** Timeout used to open sub-menus on hover. */
  _openTimeout: any;

  /** Timeout used to close sub-menus on hover out. */
  _closeTimeout: any;

  /** The tab index of the menu. */
  tabIndex = () => this.listBehavior.tabIndex();

  /** Whether the menu should be focused on mouse over. */
  shouldFocus = computed(() => {
    const root = this.root();

    if (root instanceof MenuTriggerPattern) {
      return true;
    }

    if (root instanceof MenuBarPattern || root instanceof MenuPattern) {
      return root.isFocused();
    }

    return false;
  });

  /** The key used to expand sub-menus. */
  private _expandKey = computed(() => {
    return this.inputs.textDirection() === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  });

  /** The key used to collapse sub-menus. */
  private _collapseKey = computed(() => {
    return this.inputs.textDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  });

  /** Represents the space key. Does nothing when the user is actively using typeahead. */
  dynamicSpaceKey = computed(() => (this.listBehavior.isTyping() ? '' : ' '));

  /** The regexp used to decide if a key should trigger typeahead. */
  typeaheadRegexp = /^.$/;

  /** The root of the menu. */
  root: Signal<MenuTriggerPattern<V> | MenuBarPattern<V> | MenuPattern<V> | undefined> = computed(
    () => {
      const parent = this.inputs.parent();

      if (!parent) {
        return this;
      }

      if (parent instanceof MenuTriggerPattern) {
        return parent;
      }

      const grandparent = parent.inputs.parent();

      if (grandparent instanceof MenuBarPattern) {
        return grandparent;
      }

      return grandparent?.root();
    },
  );

  /** Handles keyboard events for the menu. */
  keydownManager = computed(() => {
    return new KeyboardEventManager()
      .on('ArrowDown', () => this.next())
      .on('ArrowUp', () => this.prev())
      .on('Home', () => this.first())
      .on('End', () => this.last())
      .on('Enter', () => this.trigger())
      .on('Escape', () => this.closeAll())
      .on(this._expandKey, () => this.expand())
      .on(this._collapseKey, () => this.collapse())
      .on(this.dynamicSpaceKey, () => this.trigger())
      .on(this.typeaheadRegexp, e => this.listBehavior.search(e.key));
  });

  constructor(readonly inputs: MenuInputs<V>) {
    this.id = inputs.id;
    this.listBehavior = new List<MenuItemPattern<V>, V>({
      ...inputs,
      values: signalFn([]),
    });
  }

  /** Sets the default state for the menu. */
  setDefaultState() {
    if (!this.inputs.parent()) {
      this.listBehavior.goto(this.inputs.items()[0], {focusElement: false});
    }
  }

  /** Handles keyboard events for the menu. */
  onKeydown(event: KeyboardEvent) {
    this.keydownManager().handle(event);
  }

  /** Handles mouseover events for the menu. */
  onMouseOver(event: MouseEvent) {
    if (!this.visible()) {
      return;
    }

    this.hasBeenHovered.set(true);
    const item = this.inputs.items().find(i => i.element()?.contains(event.target as Node));

    if (!item) {
      return;
    }

    const parent = this.inputs.parent();
    const activeItem = this?.inputs.activeItem();

    if (parent instanceof MenuItemPattern) {
      const grandparent = parent.inputs.parent();
      if (grandparent instanceof MenuPattern) {
        grandparent._clearTimeouts();
        grandparent.listBehavior.goto(parent, {focusElement: false});
      }
    }

    if (activeItem && activeItem !== item) {
      this._closeItem(activeItem);
    }

    if (item.expanded()) {
      this._clearCloseTimeout();
    }

    this._openItem(item);
    this.listBehavior.goto(item, {focusElement: this.shouldFocus()});
  }

  /** Closes the specified menu item after a delay. */
  private _closeItem(item: MenuItemPattern<V>) {
    this._clearOpenTimeout();

    if (!this._closeTimeout) {
      this._closeTimeout = setTimeout(() => {
        item.close();
        this._closeTimeout = undefined;
      }, this.inputs.expansionDelay());
    }
  }

  /** Opens the specified menu item after a delay. */
  private _openItem(item: MenuItemPattern<V>) {
    this._clearOpenTimeout();

    this._openTimeout = setTimeout(() => {
      item.open();
      this._openTimeout = undefined;
    }, this.inputs.expansionDelay());
  }

  /** Handles mouseout events for the menu. */
  onMouseOut(event: MouseEvent) {
    this._clearOpenTimeout();

    if (this.isFocused()) {
      return;
    }

    const root = this.root();
    const parent = this.inputs.parent();
    const relatedTarget = event.relatedTarget as Node | null;

    if (!root || !parent || parent instanceof MenuTriggerPattern) {
      return;
    }

    const grandparent = parent.inputs.parent();

    if (!grandparent || grandparent instanceof MenuBarPattern) {
      return;
    }

    if (!grandparent.inputs.element()?.contains(relatedTarget)) {
      parent.close();
    }
  }

  /** Handles click events for the menu. */
  onClick(event: MouseEvent) {
    const relatedTarget = event.target as Node | null;
    const item = this.inputs.items().find(i => i.element()?.contains(relatedTarget));

    if (item) {
      item.open();
      this.listBehavior.goto(item);
      this.submit(item);
    }
  }

  /** Handles focusin events for the menu. */
  onFocusIn() {
    this.isFocused.set(true);
    this.hasBeenFocused.set(true);
  }

  /** Handles the focusout event for the menu. */
  onFocusOut(event: FocusEvent) {
    const parent = this.inputs.parent();
    const parentEl = parent?.inputs.element();
    const relatedTarget = event.relatedTarget as Node | null;

    if (!relatedTarget) {
      this.isFocused.set(false);
      this.inputs.parent()?.close({refocus: true});
    }

    if (parent instanceof MenuItemPattern) {
      const grandparent = parent.inputs.parent();
      const siblings = grandparent?.inputs.items().filter((i: MenuItemPattern<V>) => i !== parent);
      const item = siblings?.find((i: MenuItemPattern<V>) => i.element()?.contains(relatedTarget));

      if (item) {
        return;
      }
    }

    if (
      this.visible() &&
      !parentEl?.contains(relatedTarget) &&
      !this.inputs.element()?.contains(relatedTarget)
    ) {
      this.isFocused.set(false);
      this.inputs.parent()?.close();
    }
  }

  /** Focuses the previous menu item. */
  prev() {
    this.inputs.activeItem()?.close();
    this.listBehavior.prev();
  }

  /** Focuses the next menu item. */
  next() {
    this.inputs.activeItem()?.close();
    this.listBehavior.next();
  }

  /** Focuses the first menu item. */
  first() {
    this.inputs.activeItem()?.close();
    this.listBehavior.first();
  }

  /** Focuses the last menu item. */
  last() {
    this.inputs.activeItem()?.close();
    this.listBehavior.last();
  }

  /** Triggers the active menu item. */
  trigger() {
    this.inputs.activeItem()?.hasPopup()
      ? this.inputs.activeItem()?.open({first: true})
      : this.submit();
  }

  /** Submits the menu. */
  submit(item = this.inputs.activeItem()) {
    const root = this.root();

    if (item && !item.disabled()) {
      const isMenu = root instanceof MenuPattern;
      const isMenuBar = root instanceof MenuBarPattern;
      const isMenuTrigger = root instanceof MenuTriggerPattern;

      if (!item.submenu() && isMenuTrigger) {
        root.close({refocus: true});
      }

      if (!item.submenu() && isMenuBar) {
        root.close();
        root?.inputs.onSelect?.(item.value());
      }

      if (!item.submenu() && isMenu) {
        root.inputs.activeItem()?.close({refocus: true});
        root?.inputs.onSelect?.(item.value());
      }
    }
  }

  /** Collapses the current menu or focuses the previous item in the menubar. */
  collapse() {
    const root = this.root();
    const parent = this.inputs.parent();

    if (parent instanceof MenuItemPattern && !(parent.inputs.parent() instanceof MenuBarPattern)) {
      parent.close({refocus: true});
    } else if (root instanceof MenuBarPattern) {
      root.prev();
    }
  }

  /** Expands the current menu or focuses the next item in the menubar. */
  expand() {
    const root = this.root();
    const activeItem = this.inputs.activeItem();

    if (activeItem?.submenu()) {
      activeItem.open({first: true});
    } else if (root instanceof MenuBarPattern) {
      root.next();
    }
  }

  /** Closes the menu. */
  close() {
    this.inputs.parent()?.close();
  }

  /** Closes the menu and all parent menus. */
  closeAll() {
    const root = this.root();

    if (root instanceof MenuTriggerPattern) {
      root.close({refocus: true});
    }

    if (root instanceof MenuBarPattern) {
      root.close();
    }

    if (root instanceof MenuPattern) {
      root.inputs.activeItem()?.close({refocus: true});
    }
  }

  /** Clears any open or close timeouts for sub-menus. */
  _clearTimeouts() {
    this._clearOpenTimeout();
    this._clearCloseTimeout();
  }

  /** Clears the open timeout. */
  _clearOpenTimeout() {
    if (this._openTimeout) {
      clearTimeout(this._openTimeout);
      this._openTimeout = undefined;
    }
  }

  /** Clears the close timeout. */
  _clearCloseTimeout() {
    if (this._closeTimeout) {
      clearTimeout(this._closeTimeout);
      this._closeTimeout = undefined;
    }
  }
}
