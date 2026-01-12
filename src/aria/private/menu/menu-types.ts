/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {SignalLike} from '../behaviors/signal-like/signal-like';
import {ListInputs, ListItem} from '../behaviors/list/list';

// Forward declarations - these will be imported in the actual implementation files
export type MenuPattern<V> = any;
export type MenuBarPattern<V> = any;
export type MenuTriggerPattern<V> = any;
export type MenuItemPattern<V> = any;

/** The inputs for the MenuBarPattern class. */
export interface MenuBarInputs<V> extends ListInputs<MenuItemPattern<V>, V> {
  /** The menu items contained in the menu. */
  items: SignalLike<MenuItemPattern<V>[]>;

  /** Callback function triggered when a menu item is selected. */
  onSelect?: (value: V) => void;

  /** The text direction of the menu bar. */
  textDirection: SignalLike<'ltr' | 'rtl'>;
}

/** The inputs for the MenuPattern class. */
export interface MenuInputs<V> extends Omit<ListInputs<MenuItemPattern<V>, V>, 'values'> {
  /** The unique ID of the menu. */
  id: SignalLike<string>;

  /** The menu items contained in the menu. */
  items: SignalLike<MenuItemPattern<V>[]>;

  /** A reference to the parent menu or menu trigger. */
  parent: SignalLike<MenuTriggerPattern<V> | MenuItemPattern<V> | undefined>;

  /** Callback function triggered when a menu item is selected. */
  onSelect?: (value: V) => void;

  /** The text direction of the menu bar. */
  textDirection: SignalLike<'ltr' | 'rtl'>;

  /** The delay in milliseconds before expanding sub-menus on hover. */
  expansionDelay: SignalLike<number>;
}

/** The inputs for the MenuTriggerPattern class. */
export interface MenuTriggerInputs<V> {
  /** A reference to the menu trigger element. */
  element: SignalLike<HTMLElement | undefined>;

  /** A reference to the menu associated with the trigger. */
  menu: SignalLike<MenuPattern<V> | undefined>;

  /** The text direction of the menu bar. */
  textDirection: SignalLike<'ltr' | 'rtl'>;

  /** Whether the menu trigger is disabled. */
  disabled: SignalLike<boolean>;
}

/** The inputs for the MenuItemPattern class. */
export interface MenuItemInputs<V> extends Omit<ListItem<V>, 'index' | 'selectable'> {
  /** A reference to the parent menu or menu trigger. */
  parent: SignalLike<MenuPattern<V> | MenuBarPattern<V> | undefined>;

  /** A reference to the submenu associated with the menu item. */
  submenu: SignalLike<MenuPattern<V> | undefined>;
}
