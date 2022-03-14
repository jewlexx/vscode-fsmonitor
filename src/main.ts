import vscode, { type TextDocument, type StatusBarItem } from 'vscode';
import filesize from 'filesize';

export default class Extension {
  private _enabled: boolean = this.configuration.get('enabled') || false;
  private _fileSizeItem: StatusBarItem | null = null;

  private get alignment() {
    return this.configuration.get('position') === 'right' ? 2 : 1;
  }

  private get configuration() {
    return vscode.workspace.getConfiguration('fsMonitor');
  }

  private get folderSizeEnabled(): boolean {
    return this.configuration.get<boolean>('folderSizeEnabled') ?? false;
  }

  private get enabled() {
    return this._enabled;
  }

  private set enabled(enabled: boolean) {
    this._enabled = enabled;
    this.configuration.update('enabled', enabled);
  }

  private get fileSizeItem() {
    return this._fileSizeItem;
  }

  private set fileSizeItem(item: StatusBarItem | null) {
    if (item === null) {
      this._fileSizeItem?.dispose();
    }

    this._fileSizeItem = item;
  }

  oldFileSize = 0;
  oldFolderSize = 0;

  deactivate() {
    this.fileSizeItem?.dispose();
  }

  constructor(private context: vscode.ExtensionContext) {
    // Bindings so anything done in the following functions is done in the context of the extension
    this.updateStatusBar = this.updateStatusBar.bind(this);
    this.getFileSize = this.getFileSize.bind(this);
    this.getFolderSize = this.getFolderSize.bind(this);
    this.getWorkspaceSize = this.getWorkspaceSize.bind(this);
    this.updateConfiguration = this.updateConfiguration.bind(this);
    this.toggle = this.toggle.bind(this);

    // Event listeners and commands
    const events = [
      vscode.commands.registerCommand('fsMonitor.toggle', this.toggle),
      vscode.workspace.onDidChangeConfiguration(this.updateConfiguration),
      vscode.window.onDidChangeActiveTextEditor((e) => {
        this.updateStatusBar(e?.document);
      }),
      vscode.workspace.onWillSaveTextDocument((e) => {
        console.log('Will save text doc');
        this.updateStatusBar(e.document);
      }),
    ];

    context.subscriptions.push(...events);

    // Initializes the status bar
    // this.updateStatusBar();
  }

  private createStatusBarItem() {
    if (!this.enabled) {
      return null;
    }

    if (this.fileSizeItem) {
      return this.fileSizeItem;
    }

    const item = vscode.window.createStatusBarItem(
      this.alignment,
      // I have it at 100 because personally it's how I prefer it
      100,
    );

    item.command = 'fsMonitor.toggle';
    item.tooltip = 'Toggle FS Monitor On/Off';

    this.context.subscriptions.push(item);

    item.show();

    return item;
  }

  private toggle() {
    this.enabled = !this.enabled;

    console.debug('Toggled');

    this.updateStatusBar(vscode.window.activeTextEditor?.document);
  }

  private updateConfiguration(e: vscode.ConfigurationChangeEvent) {
    if (!e.affectsConfiguration('fsMonitor')) {
      return;
    }

    this._enabled = this.configuration.get<boolean>('enabled') || false;

    this.updateStatusBar(vscode.window.activeTextEditor?.document);
  }

  private /* async */ updateStatusBar(doc: TextDocument | undefined) {
    const currentFileSize = this.getFileSize(doc);
    const currentFolderSize = undefined; /* await this.getWorkspaceSize() */

    if (!currentFileSize && !currentFolderSize) {
      this.fileSizeItem = null;
      return;
    }

    const newItem = this.createStatusBarItem();

    if (newItem) {
      const text: string[] = [];
      if (currentFileSize) {
        text.push(`$(file) ${currentFileSize}`);
      }
      if (currentFolderSize) {
        text.push(`$(folder) ${currentFolderSize ?? 0}`);
      }

      this.fileSizeItem = {
        ...newItem,
        text: text.join(' | '),
      };
    }
  }

  private getFileSize(doc: TextDocument | undefined) {
    if (!doc) {
      return undefined;
    }

    const startPos = new vscode.Position(0, 0);
    const endPos = new vscode.Position(doc.lineCount - 1, 0);
    const range = new vscode.Range(startPos, endPos);

    const file = doc.getText(range);

    console.debug('Read File Size');

    return filesize(file.length);
  }

  private async getWorkspaceSize() {
    if (!vscode.workspace.workspaceFolders || !this.folderSizeEnabled) {
      return;
    }

    const s = await (() => {
      if (vscode.workspace.workspaceFolders.length > 1) {
        return vscode.workspace.workspaceFolders.reduce(
          async (prev, folder) =>
            (await prev) + (await this.getFolderSize(folder.uri)),
          Promise.resolve(0),
        );
      } else {
        return this.getFolderSize(vscode.workspace.workspaceFolders[0].uri);
      }
    })();

    return filesize(s);
  }

  private async getFolderSize(uri: vscode.Uri) {
    const ignoreNodeModules = this.configuration.get('ignoreNodeModules');

    const { fs } = vscode.workspace;

    const ignore = (str: string) => {
      if (ignoreNodeModules) {
        return /node_modules/g.test(str);
      }
      return true;
    };

    const dir = (await fs.readDirectory(uri)).filter(
      ([name]) => !ignore(name ?? ''),
    );

    const p: Promise<number>[] = dir.map(async ([name, type]) => {
      if (type === vscode.FileType.Directory) {
        return await this.getFolderSize(vscode.Uri.joinPath(uri, name)).catch(
          () => 0,
        );
      }

      return (await fs.readFile(vscode.Uri.joinPath(uri, name))).length;
    });

    return p.reduce(
      (prev, curr) => prev.then((v) => curr.then((c) => v + c)),
      Promise.resolve(0),
    );
  }
}
