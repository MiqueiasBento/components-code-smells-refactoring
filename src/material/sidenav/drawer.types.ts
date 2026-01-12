/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {InjectionToken} from '@angular/core';

/** Options for where to set focus to automatically on dialog open */
export type AutoFocusTarget = 'dialog' | 'first-tabbable' | 'first-heading';

/** Result of the toggle promise that indicates the state of the drawer. */
export type MatDrawerToggleResult = 'open' | 'close';

/** Drawer and SideNav display modes. */
export type MatDrawerMode = 'over' | 'push' | 'side';

/** Configures whether drawers should use auto sizing by default. */
export const MAT_DRAWER_DEFAULT_AUTOSIZE = new InjectionToken<boolean>(
  'MAT_DRAWER_DEFAULT_AUTOSIZE',
  {
    providedIn: 'root',
    factory: () => false,
  },
);

/**
 * Used to provide a drawer container to a drawer while avoiding circular references.
 * @docs-private
 */
export const MAT_DRAWER_CONTAINER = new InjectionToken('MAT_DRAWER_CONTAINER');

/**
 * Throws an exception when two MatDrawer are matching the same position.
 * @docs-private
 */
export function throwMatDuplicatedDrawerError(position: string) {
  throw Error(`A drawer was already declared for 'position="${position}"'`);
}
