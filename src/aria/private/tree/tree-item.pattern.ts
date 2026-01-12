/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed} from '@angular/core';
import {ExpansionItem, ListExpansion} from '../behaviors/expansion/expansion';
import {ListItem} from '../behaviors/list/list';
import {SignalLike, WritableSignalLike} from '../behaviors/signal-like/signal-like';
import {TreePattern} from './tree.pattern';
import {TreeItemInputs} from './tree.types';

/**
 * Represents an item in a Tree.
 */
export class TreeItemPattern<V> implements ListItem<V>, ExpansionItem {
  /** A unique identifier for this item. */
  readonly id: SignalLike<string> = () => this.inputs.id();

  /** The value of this item. */
  readonly value: SignalLike<V> = () => this.inputs.value();

  /** A reference to the item element. */
  readonly element: SignalLike<HTMLElement> = () => this.inputs.element()!;

  /** Whether the item is disabled. */
  readonly disabled: SignalLike<boolean> = () => this.inputs.disabled();

  /** The text used by the typeahead search. */
  readonly searchTerm: SignalLike<string> = () => this.inputs.searchTerm();

  /** The tree pattern this item belongs to. */
  readonly tree: SignalLike<TreePattern<V>> = () => this.inputs.tree();

  /** The parent item. */
  readonly parent: SignalLike<TreeItemPattern<V> | TreePattern<V>> = () => this.inputs.parent();

  /** The children items. */
  readonly children: SignalLike<TreeItemPattern<V>[]> = () => this.inputs.children();

  /** The position of this item among its siblings. */
  readonly index = computed(() => this.tree().visibleItems().indexOf(this));

  /** Controls expansion for child items. */
  readonly expansionBehavior: ListExpansion;

  /** Whether the item is expandable. It's expandable if children item exist. */
  readonly expandable: SignalLike<boolean> = () => this.inputs.hasChildren();

  /** Whether the item is selectable. */
  readonly selectable: SignalLike<boolean> = () => this.inputs.selectable();

  /** Whether the item is expanded. */
  readonly expanded: WritableSignalLike<boolean>;

  /** The level of the current item in a tree. */
  readonly level: SignalLike<number> = computed(() => this.parent().level() + 1);

  /** Whether this item is visible. */
  readonly visible: SignalLike<boolean> = computed(
    () => this.parent().expanded() && this.parent().visible(),
  );

  /** The number of items under the same parent at the same level. */
  readonly setsize = computed(() => this.parent().children().length);

  /** The position of this item among its siblings (1-based). */
  readonly posinset = computed(() => this.parent().children().indexOf(this) + 1);

  /** Whether the item is active. */
  readonly active = computed(() => this.tree().activeItem() === this);

  /** The tab index of the item. */
  readonly tabIndex = computed(() => this.tree().listBehavior.getItemTabindex(this));

  /** Whether the item is selected. */
  readonly selected: SignalLike<boolean | undefined> = computed(() => {
    if (this.tree().nav()) {
      return undefined;
    }
    if (!this.selectable()) {
      return undefined;
    }
    return this.tree().values().includes(this.value());
  });

  /** The current type of this item. */
  readonly current: SignalLike<string | undefined> = computed(() => {
    if (!this.tree().nav()) {
      return undefined;
    }
    if (!this.selectable()) {
      return undefined;
    }
    return this.tree().values().includes(this.value()) ? this.tree().currentType() : undefined;
  });

  constructor(readonly inputs: TreeItemInputs<V>) {
    this.expanded = inputs.expanded;
    this.expansionBehavior = new ListExpansion({
      ...inputs,
      multiExpandable: () => true,
      items: this.children,
      disabled: computed(() => this.tree()?.disabled() ?? false),
    });
  }
}
