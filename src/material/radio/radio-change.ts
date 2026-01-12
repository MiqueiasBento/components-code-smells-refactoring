/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {MatRadioButton} from './radio-button';

/** Change event object emitted by radio button and radio group. */
export class MatRadioChange<T = any> {
  constructor(
    /** The radio button that emits the change event. */
    public source: MatRadioButton,
    /** The value of the radio button. */
    public value: T,
  ) {}
}
