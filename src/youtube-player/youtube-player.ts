/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="youtube" preserve="true" />

export * from './youtube-api-loader.service';
export * from './youtube-player-state';
export {YouTubePlayerComponent as YoutubePlayer} from './youtube-player.component';
export * from './youtube-player.facade';
export * from './youtube-player.tokens';
