/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {InjectionToken} from '@angular/core';
import {ThemePalette} from '../core';
import {MatRadioGroup} from './radio-group';

export interface MatRadioDefaultOptions {
  /**
   * Theme color of the radio button. This API is supported in M2 themes only, it
   * has no effect in M3 themes. For color customization in M3, see https://material.angular.dev/components/radio/styling.
   *
   * For information on applying color variants in M3, see
   * https://material.angular.dev/guide/material-2-theming#optional-add-backwards-compatibility-styles-for-color-variants
   */
  color: ThemePalette;

  /** Whether disabled radio buttons should be interactive. */
  disabledInteractive?: boolean;
}

/** Injection token that can be used to inject instances of `MatRadioGroup`. */
export const MAT_RADIO_GROUP = new InjectionToken<MatRadioGroup>('MatRadioGroup');

/** Injection token for default radio options. */
export const MAT_RADIO_DEFAULT_OPTIONS = new InjectionToken<MatRadioDefaultOptions>(
  'mat-radio-default-options',
  {
    providedIn: 'root',
    factory: () => ({
      color: 'accent',
      disabledInteractive: false,
    }),
  },
);
