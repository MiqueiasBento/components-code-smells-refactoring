import {WritableSignal, computed, signal} from '@angular/core';
import {KeyboardEventManager, PointerEventManager} from '../behaviors/event-manager';
import {ListExpansion, ListExpansionInputs} from '../behaviors/expansion/expansion';
import {ListFocus} from '../behaviors/list-focus/list-focus';
import {ListNavigation, ListNavigationInputs} from '../behaviors/list-navigation/list-navigation';
import {SignalLike} from '../public-api';
import {TabPattern} from './tab-pattern';

/** The required inputs for the tablist. */
export interface TabListInputs
  extends Omit<ListNavigationInputs<TabPattern>, 'multi'>,
    Omit<ListExpansionInputs, 'multiExpandable' | 'items'> {
  /** The selection strategy used by the tablist. */
  selectionMode: SignalLike<'follow' | 'explicit'>;
}

/** Controls the state of a tablist. */
export class TabListPattern {
  /** The list focus behavior for the tablist. */
  readonly focusBehavior: ListFocus<TabPattern>;

  /** The list navigation behavior for the tablist. */
  readonly navigationBehavior: ListNavigation<TabPattern>;

  /** Controls expansion for the tablist. */
  readonly expansionBehavior: ListExpansion;

  /** The currently active tab. */
  readonly activeTab: SignalLike<TabPattern | undefined> = () => this.inputs.activeItem();

  /** The currently selected tab. */
  readonly selectedTab: WritableSignal<TabPattern | undefined> = signal(undefined);

  /** Whether the tablist is vertically or horizontally oriented. */
  readonly orientation: SignalLike<'vertical' | 'horizontal'> = () => this.inputs.orientation();

  /** Whether the tablist is disabled. */
  readonly disabled: SignalLike<boolean> = () => this.inputs.disabled();

  /** The tab index of the tablist. */
  readonly tabIndex = computed(() => this.focusBehavior.getListTabIndex());

  /** The id of the current active tab. */
  readonly activeDescendant = computed(() => this.focusBehavior.getActiveDescendant());

  /** Whether selection should follow focus. */
  readonly followFocus = computed(() => this.inputs.selectionMode() === 'follow');

  /** The key used to navigate to the previous tab in the tablist. */
  readonly prevKey = computed(() => {
    if (this.inputs.orientation() === 'vertical') {
      return 'ArrowUp';
    }
    return this.inputs.textDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  });

  /** The key used to navigate to the next item in the list. */
  readonly nextKey = computed(() => {
    if (this.inputs.orientation() === 'vertical') {
      return 'ArrowDown';
    }
    return this.inputs.textDirection() === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  });

  /** The keydown event manager for the tablist. */
  readonly keydown = computed(() => {
    return new KeyboardEventManager()
      .on(this.prevKey, () =>
        this._navigate(() => this.navigationBehavior.prev(), this.followFocus()),
      )
      .on(this.nextKey, () =>
        this._navigate(() => this.navigationBehavior.next(), this.followFocus()),
      )
      .on('Home', () => this._navigate(() => this.navigationBehavior.first(), this.followFocus()))
      .on('End', () => this._navigate(() => this.navigationBehavior.last(), this.followFocus()))
      .on(' ', () => this.open())
      .on('Enter', () => this.open());
  });

  /** The pointerdown event manager for the tablist. */
  readonly pointerdown = computed(() => {
    return new PointerEventManager().on(e =>
      this._navigate(() => this.navigationBehavior.goto(this._getItem(e)!), true),
    );
  });

  constructor(readonly inputs: TabListInputs) {
    this.focusBehavior = new ListFocus(inputs);

    this.navigationBehavior = new ListNavigation({
      ...inputs,
      focusManager: this.focusBehavior,
    });

    this.expansionBehavior = new ListExpansion({
      ...inputs,
      multiExpandable: () => false,
    });
  }

  /**
   * Sets the tablist to its default initial state.
   *
   * Sets the active index of the tablist to the first focusable selected
   * tab if one exists. Otherwise, sets focus to the first focusable tab.
   *
   * This method should be called once the tablist and its tabs are properly initialized.
   */
  setDefaultState() {
    let firstItem: TabPattern | undefined;

    for (const item of this.inputs.items()) {
      if (!this.focusBehavior.isFocusable(item)) continue;

      if (firstItem === undefined) {
        firstItem = item;
      }

      if (item.selected()) {
        this.inputs.activeItem.set(item);
        return;
      }
    }
    if (firstItem !== undefined) {
      this.inputs.activeItem.set(firstItem);
    }
  }

  /** Handles keydown events for the tablist. */
  onKeydown(event: KeyboardEvent) {
    if (!this.disabled()) {
      this.keydown().handle(event);
    }
  }

  /** The pointerdown event manager for the tablist. */
  onPointerdown(event: PointerEvent) {
    if (!this.disabled()) {
      this.pointerdown().handle(event);
    }
  }

  /** Opens the tab by given value. */
  open(value: string): boolean;

  /** Opens the given tab or the current active tab. */
  open(tab?: TabPattern): boolean;

  open(tab: TabPattern | string | undefined): boolean {
    tab ??= this.activeTab();

    if (typeof tab === 'string') {
      tab = this.inputs.items().find(t => t.value() === tab);
    }

    if (tab === undefined) return false;

    const success = this.expansionBehavior.open(tab);
    if (success) {
      this.selectedTab.set(tab);
    }

    return success;
  }

  /** Executes a navigation operation and expand the active tab if needed. */
  private _navigate(op: () => boolean, shouldExpand: boolean = false): void {
    const success = op();
    if (success && shouldExpand) {
      this.open();
    }
  }

  /** Returns the tab item associated with the given pointer event. */
  private _getItem(e: PointerEvent) {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }

    const element = e.target.closest('[role="tab"]');
    return this.inputs.items().find(i => i.element() === element);
  }
}
