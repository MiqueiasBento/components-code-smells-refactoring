/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {InjectionToken} from '@angular/core';
import {ThemePalette} from '../core';

/** Last animation end data. */
export interface ProgressAnimationEnd {
  value: number;
}

/** Default `mat-progress-bar` options that can be overridden. */
export interface MatProgressBarDefaultOptions {
  /**
   * Default theme color of the progress bar. This API is supported in M2 themes only,
   * it has no effect in M3 themes. For color customization in M3, see https://material.angular.dev/components/progress-bar/styling.
   *
   * For information on applying color variants in M3, see
   * https://material.angular.dev/guide/material-2-theming#optional-add-backwards-compatibility-styles-for-color-variants
   */
  color?: ThemePalette;

  /** Default mode of the progress bar. */
  mode?: ProgressBarMode;
}

/** Injection token to be used to override the default options for `mat-progress-bar`. */
export const MAT_PROGRESS_BAR_DEFAULT_OPTIONS = new InjectionToken<MatProgressBarDefaultOptions>(
  'MAT_PROGRESS_BAR_DEFAULT_OPTIONS',
);

/**
 * Stubbed out location for `MatProgressBar`.
 * @docs-private
 */
export interface MatProgressBarLocation {
  getPathname: () => string;
}

export type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';
