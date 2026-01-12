/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {shareReplay, tap} from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class DocFetcher {
  private _http = inject(HttpClient);

  private _cache: Record<string, Observable<string>> = {};

  fetchDocument(url: string): Observable<string> {
    if (this._cache[url]) {
      return this._cache[url];
    }

    const stream = this._http.get(url, {responseType: 'text'}).pipe(shareReplay(1));
    return stream.pipe(tap(() => (this._cache[url] = stream)));
  }
}
