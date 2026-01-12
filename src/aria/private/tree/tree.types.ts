/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {ExpansionItem} from '../behaviors/expansion/expansion';
import {ListInputs, ListItem} from '../behaviors/list/list';
import {SignalLike} from '../behaviors/signal-like/signal-like';
import {TreeItemPattern} from './tree-item.pattern';
import {TreePattern} from './tree.pattern';

/** Represents the required inputs for a tree item. */
export interface TreeItemInputs<V>
  extends Omit<ListItem<V>, 'index'>,
    Omit<ExpansionItem, 'expandable'> {
  /** The parent item. */
  parent: SignalLike<TreeItemPattern<V> | TreePattern<V>>;

  /** Whether this item has children. Children can be lazily loaded. */
  hasChildren: SignalLike<boolean>;

  /** The children items. */
  children: SignalLike<TreeItemPattern<V>[]>;

  /** The tree pattern this item belongs to. */
  tree: SignalLike<TreePattern<V>>;
}

/** The selection operations that the tree can perform. */
export interface SelectOptions {
  toggle?: boolean;
  selectOne?: boolean;
  selectRange?: boolean;
  anchor?: boolean;
}

/** Represents the required inputs for a tree. */
export interface TreeInputs<V> extends Omit<ListInputs<TreeItemPattern<V>, V>, 'items'> {
  /** A unique identifier for the tree. */
  id: SignalLike<string>;

  /** All items in the tree, in document order (DFS-like, a flattened list). */
  allItems: SignalLike<TreeItemPattern<V>[]>;

  /** Whether the tree is in navigation mode. */
  nav: SignalLike<boolean>;

  /** The aria-current type. */
  currentType: SignalLike<'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'>;
}
