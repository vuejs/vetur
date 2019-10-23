import { platform } from 'os';
import Uri from 'vscode-uri';

/**
 * Vetur mainly deals with paths / uris from two objects
 *
 * - `TextDocument` from `vscode-languageserver`
 * - `SourceFile` from `typescript`
 *
 * TypeScript Language Service uses `fileName`, which is a file path without scheme.
 * Convert them into standard URI by `Uri.file`.
 *
 * ## `TextDocument.uri`
 *
 * - macOS / Linux: file:///foo/bar.vue
 * - Windows: file:///c%3A/foo/bar.vue (%3A is `:`)
 *
 * ## `SourceFile.fileName`
 *
 * - macOS / Linux: /foo/bar.vue
 * - Windows: c:/foo/bar.vue
 *
 * ## vscode-uri
 *
 * - `Uri.parse`: Takes full URI starting with `file://`
 * - `Uri.file`: Takes file path
 *
 * ### `fsPath` vs `path`
 *
 * - macOS / Linux:
 * ```
 * > Uri.parse('file:///foo/bar.vue').fsPath
 * '/foo/bar.vue'
 * > Uri.parse('file:///foo/bar.vue').path
 * '/foo/bar.vue'
 * ```
 * - Windows
 * ```
 * > Uri.parse('file:///c%3A/foo/bar.vue').fsPath
 * 'c:\\foo\\bar.vue' (\\ escapes to \)
 * > Uri.parse('file:///c%3A/foo/bar.vue').path
 * '/c:/foo/bar.vue'
 * ```
 */

export function getFileFsPath(documentUri: string): string {
  return Uri.parse(documentUri).fsPath;
}

export function getFilePath(documentUri: string): string {
  const IS_WINDOWS = platform() === 'win32';
  if (IS_WINDOWS) {
    // Windows have a leading slash like /C:/Users/pine
    return Uri.parse(documentUri).path.slice(1);
  } else {
    return Uri.parse(documentUri).path;
  }
}

export function normalizeFileNameToFsPath(fileName: string) {
  return Uri.file(fileName).fsPath;
}
