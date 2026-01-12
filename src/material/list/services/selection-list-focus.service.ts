import {_getFocusedElementPierceShadowDom} from '@angular/cdk/platform';
import {ElementRef, Injectable, QueryList} from '@angular/core';
import {MatListOption} from '../list-option';

@Injectable()
export class SelectionListFocusService {
  private _listElement: HTMLElement | null = null;
  private _items: QueryList<MatListOption> | null = null;

  /**
   * Inicializa o serviço de foco.
   * @param element ElementRef do mat-selection-list
   * @param items Lista de opções
   */
  initialize(element: ElementRef<HTMLElement>, items: QueryList<MatListOption>): void {
    this._listElement = element.nativeElement;
    this._items = items;
  }

  /**
   * Verifica se o foco atual está dentro da lista
   * (considerando Shadow DOM).
   */
  containsFocus(): boolean {
    if (!this._listElement) {
      return false;
    }

    const focusedElement = _getFocusedElementPierceShadowDom();
    return !!focusedElement && this._listElement.contains(focusedElement);
  }

  /**
   * Reseta o item ativo.
   * Usado quando a seleção muda e a lista não está focada.
   */
  resetActiveOption(items: QueryList<MatListOption>, disabled: boolean): void {
    if (disabled || !items.length) {
      return;
    }

    // Prioridade:
    // 1. Primeiro item selecionado
    // 2. Primeiro item habilitado
    const itemToFocus =
      items.find(option => option.selected && !option.disabled) ??
      items.find(option => !option.disabled);

    if (itemToFocus) {
      itemToFocus._setTabindex(0);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this._listElement = null;
    this._items = null;
  }
}
