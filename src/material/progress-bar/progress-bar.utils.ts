/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {DOCUMENT} from '@angular/common';
import {inject, InjectionToken} from '@angular/core';
import {MatProgressBarLocation} from './progress-bar.types';

/**
 * Injection token used to provide the current location to `MatProgressBar`.
 * Used to handle server-side rendering and to stub out during unit tests.
 * @docs-private
 */
export const MAT_PROGRESS_BAR_LOCATION = new InjectionToken<MatProgressBarLocation>(
  'mat-progress-bar-location',
  {
    providedIn: 'root',
    factory: () => {
      const _document = inject(DOCUMENT);
      const _location = _document ? _document.location : null;

      return {
        // Note that this needs to be a function, rather than a property, because Angular
        // will only resolve it once, but we want the current path on each call.
        getPathname: () => (_location ? _location.pathname + _location.search : ''),
      };
    },
  },
);

/** Clamps a value to be between two numbers, by default 0 and 100. */
export function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}
