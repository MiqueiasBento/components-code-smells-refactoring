/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {FocusKeyManager} from '@angular/cdk/a11y';
import {A, ENTER, SPACE, hasModifierKey} from '@angular/cdk/keycodes';
import {Injectable, NgZone, QueryList, inject} from '@angular/core';
import {MatListOption} from '../list-option';

/**
 * Service responsible for handling keyboard navigation in selection lists.
 * Manages keyboard focus and selection through keyboard interactions.
 */
@Injectable()
export class SelectionListKeyboardService {
  private readonly _ngZone = inject(NgZone);
  private _keyManager: FocusKeyManager<MatListOption>;

  /**
   * Initializes the keyboard manager with the given items.
   * @param items The list of options to manage.
   * @param disabled Whether the list is disabled.
   */
  initialize(items: QueryList<MatListOption>, disabled: boolean): void {
    this._keyManager = new FocusKeyManager(items)
      .withHomeAndEnd()
      .withTypeAhead()
      .withWrap()
      .skipPredicate(() => disabled);

    // Move the tabindex to the currently-focused list item.
    this._keyManager.change.subscribe(activeItemIndex => {
      items.forEach((item, itemIndex) => item._setTabindex(itemIndex === activeItemIndex ? 0 : -1));
    });
  }

  /**
   * Handles keydown events from the selection list.
   * @param event The keyboard event.
   * @param multiple Whether multiple selection is enabled.
   * @param options The available options.
   * @param emitChangeEvent Callback to emit change events.
   */
  handleKeydown(
    event: KeyboardEvent,
    multiple: boolean,
    options: QueryList<MatListOption>,
    emitChangeEvent: (shouldSelect: boolean) => void,
  ): void {
    const activeItem = this._keyManager.activeItem;

    if (
      (event.keyCode === ENTER || event.keyCode === SPACE) &&
      !this._keyManager.isTyping() &&
      activeItem &&
      !activeItem.disabled
    ) {
      event.preventDefault();
      activeItem._toggleOnInteraction();
    } else if (
      event.keyCode === A &&
      multiple &&
      !this._keyManager.isTyping() &&
      hasModifierKey(event, 'ctrlKey', 'metaKey')
    ) {
      const shouldSelect = options.some(option => !option.disabled && !option.selected);
      event.preventDefault();
      emitChangeEvent(shouldSelect);
    } else {
      this._keyManager.onKeydown(event);
    }
  }

  /**
   * Sets the active item by index.
   * @param index Index of the item to activate, -1 to deactivate all.
   */
  setActiveItem(index: number): void {
    this._keyManager?.updateActiveItem(index);
  }

  /** Gets the currently active item index. */
  get activeItemIndex(): number | null {
    return this._keyManager?.activeItemIndex ?? null;
  }

  /** Gets the currently active item. */
  get activeItem(): MatListOption | null {
    return this._keyManager?.activeItem ?? null;
  }

  /** Destroys the keyboard manager. */
  destroy(): void {
    this._keyManager?.destroy();
  }
}
