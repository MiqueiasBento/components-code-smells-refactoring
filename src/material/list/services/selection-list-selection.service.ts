/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {SelectionModel} from '@angular/cdk/collections';
import {Injectable, QueryList} from '@angular/core';
import {Observable} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {MatListOption} from '../list-option';

/**
 * Service responsible for managing selection state in selection lists.
 * Handles option selection, deselection, and state synchronization.
 */
@Injectable()
export class SelectionListSelectionService {
  /** The currently selected options. */
  selectedOptions: SelectionModel<MatListOption>;

  /** Whether multiple selection is enabled. */
  multiple = true;

  /** View to model callback. */
  onChange: (value: any) => void = () => {};

  constructor() {
    this.selectedOptions = new SelectionModel<MatListOption>(this.multiple);
  }

  /**
   * Sets the multiple selection mode.
   * @param value Whether multiple selection should be enabled.
   */
  setMultiple(value: boolean): void {
    this.multiple = value;
    this.selectedOptions = new SelectionModel(this.multiple, this.selectedOptions.selected);
  }

  /**
   * Watches for changes in the selected state and updates options accordingly.
   * @param destroyed$ Observable that emits when the component is destroyed.
   * @param containsFocus Function to check if the list contains focus.
   * @param resetActiveOption Function to reset the active option.
   */
  watchForSelectionChange(
    destroyed$: Observable<void>,
    containsFocus: () => boolean,
    resetActiveOption: () => void,
  ): void {
    this.selectedOptions.changed.pipe(takeUntil(destroyed$)).subscribe(event => {
      // Sync external changes to the model back to the options
      for (let item of event.added) {
        item.selected = true;
      }

      for (let item of event.removed) {
        item.selected = false;
      }

      if (!containsFocus()) {
        resetActiveOption();
      }
    });
  }

  /**
   * Sets the selected options based on the specified values.
   * @param values The values to select.
   * @param options The available options.
   * @param compareWith Function to compare option values.
   */
  setOptionsFromValues(
    values: string[],
    options: QueryList<MatListOption>,
    compareWith: (o1: any, o2: any) => boolean,
  ): void {
    options.forEach(option => option._setSelected(false));

    values.forEach(value => {
      const correspondingOption = options.find(option => {
        // Skip options that are already in the model
        return option.selected ? false : compareWith(option.value, value);
      });

      if (correspondingOption) {
        correspondingOption._setSelected(true);
      }
    });
  }

  /**
   * Returns the values of the selected options.
   * @param options The available options.
   * @returns Array of selected option values.
   */
  getSelectedOptionValues(options: QueryList<MatListOption>): string[] {
    return options.filter(option => option.selected).map(option => option.value);
  }
}
