import vscode from 'vscode';
import Extension from './main';

export function activate(ctx: vscode.ExtensionContext) {
  new Extension(ctx);
}
