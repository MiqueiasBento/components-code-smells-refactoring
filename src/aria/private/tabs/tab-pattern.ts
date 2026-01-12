import {computed} from '@angular/core';
import {ExpansionItem} from '../behaviors/expansion/expansion';
import {ListNavigationItem} from '../behaviors/list-navigation/list-navigation';
import {SignalLike, WritableSignalLike} from '../public-api';
import {TabListPattern} from './tab-list';
import {TabPanelPattern} from './tab-panel';

/** The required inputs to tabs. */
export interface TabInputs
  extends Omit<ListNavigationItem, 'index'>,
    Omit<ExpansionItem, 'expandable'> {
  /** The parent tablist that controls the tab. */
  tablist: SignalLike<TabListPattern>;

  /** The remote tabpanel controlled by the tab. */
  tabpanel: SignalLike<TabPanelPattern | undefined>;

  /** The remote tabpanel unique identifier. */
  value: SignalLike<string>;
}

/** A tab in a tablist. */
export class TabPattern {
  /** A global unique identifier for the tab. */
  readonly id: SignalLike<string> = () => this.inputs.id();

  /** The index of the tab. */
  readonly index = computed(() => this.inputs.tablist().inputs.items().indexOf(this));

  /** The remote tabpanel unique identifier. */
  readonly value: SignalLike<string> = () => this.inputs.value();

  /** Whether the tab is disabled. */
  readonly disabled: SignalLike<boolean> = () => this.inputs.disabled();

  /** The html element that should receive focus. */
  readonly element: SignalLike<HTMLElement> = () => this.inputs.element()!;

  /** Whether this tab has expandable panel. */
  readonly expandable: SignalLike<boolean> = () => true;

  /** Whether the tab panel is expanded. */
  readonly expanded: WritableSignalLike<boolean>;

  /** Whether the tab is active. */
  readonly active = computed(() => this.inputs.tablist().inputs.activeItem() === this);

  /** Whether the tab is selected. */
  readonly selected = computed(() => this.inputs.tablist().selectedTab() === this);

  /** The tab index of the tab. */
  readonly tabIndex = computed(() => this.inputs.tablist().focusBehavior.getItemTabIndex(this));

  /** The id of the tabpanel associated with the tab. */
  readonly controls = computed(() => this.inputs.tabpanel()?.id());

  constructor(readonly inputs: TabInputs) {
    this.expanded = inputs.expanded;
  }

  /** Opens the tab. */
  open(): boolean {
    return this.inputs.tablist().open(this);
  }
}
