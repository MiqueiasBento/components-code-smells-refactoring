/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {MatListOption} from '../list-option';
import {MatSelectionList} from '../selection-list.component';

/**
 * Change event that is fired whenever the selected state of an option changes.
 */
export class MatSelectionListChange {
  constructor(
    /** Reference to the selection list that emitted the event. */
    public source: MatSelectionList,
    /** Reference to the options that have been changed. */
    public options: MatListOption[],
  ) {}
}
