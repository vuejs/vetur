import Uri from 'vscode-uri';
import { platform } from 'os';

export function getNormalizedFileFsPath (fileName: string): string {
  return Uri.file(fileName).fsPath;
}

export function getFileFsPath (documentUri: string): string {
  return Uri.parse(documentUri).fsPath;
}

export function getFilePath (documentUri: string): string {
  if (platform() === 'win32') {
    // Windows have a leading slash like /C:/Users/pine
    return Uri.parse(documentUri).path.slice(1);
  } else {
    return Uri.parse(documentUri).path;
  }
}
