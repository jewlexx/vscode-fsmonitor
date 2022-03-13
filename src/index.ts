import vscode from 'vscode';
import Extension from './main';

let ext: Extension;

export function activate(ctx: vscode.ExtensionContext) {
  ext = new Extension(ctx);
}

export function deactivate() {
  ext.deactivate();
}
