import vscode, { type StatusBarItem } from 'vscode';
import filesize from 'filesize';

export default class Extension {
  _enabled: boolean = this.configuration.get('enabled') || false;
  _fileSizeItem: StatusBarItem | null = null;

  get alignment() {
    return this.configuration.get('position') === 'right' ? 2 : 1;
  }

  get configuration() {
    return vscode.workspace.getConfiguration('fsMonitor');
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(enabled: boolean) {
    this._enabled = enabled;
    this.configuration.update('enabled', enabled);
  }

  get fileSizeItem() {
    return this._fileSizeItem;
  }

  set fileSizeItem(item: StatusBarItem | null) {
    if (item === null) {
      this._fileSizeItem?.dispose();
    }

    this._fileSizeItem = item;
  }

  constructor(public context: vscode.ExtensionContext) {
    // Bindings so anything done in the following functions is done in the context of the extension
    this.updateStatusBar = this.updateStatusBar.bind(this);
    this.getFileSize = this.getFileSize.bind(this);
    this.getFolderSize = this.getFolderSize.bind(this);
    this.getWorkspaceSize = this.getWorkspaceSize.bind(this);
    this.updateConfiguration = this.updateConfiguration.bind(this);
    this.toggleOnOff = this.toggleOnOff.bind(this);

    // Event listeners and commands
    const events = [
      vscode.commands.registerCommand(
        'fsMonitor.toggleOnOff',
        this.toggleOnOff,
      ),
      vscode.workspace.onDidChangeConfiguration(this.updateConfiguration),
      vscode.window.onDidChangeActiveTextEditor(this.updateStatusBar),
      vscode.workspace.onDidSaveTextDocument(this.updateStatusBar),
    ];

    context.subscriptions.push(...events);

    // Initializes the status bar
    this.updateStatusBar();
  }

  createStatusBarItem() {
    if (!this.enabled) {
      return null;
    }

    if (this.fileSizeItem) {
      // Dispose of the old one before creating a new one
      this.fileSizeItem.dispose();
    }

    const item = vscode.window.createStatusBarItem(
      this.alignment,
      // I have it at 100 because personally it's how I prefer it
      100,
    );

    item.command = 'fsMonitor.toggleOnOff';
    item.tooltip = 'Toggle FS Monitor On/Off';

    this.context.subscriptions.push(item);

    return item;
  }

  toggleOnOff() {
    this.enabled = !this.enabled;

    this.updateStatusBar();
  }

  updateConfiguration(e: vscode.ConfigurationChangeEvent) {
    if (!e.affectsConfiguration('fsMonitor')) {
      return;
    }

    this._enabled = this.configuration.get<boolean>('enabled') || false;

    this.updateStatusBar();
  }

  async updateStatusBar() {
    const currentFileSize = this.getFileSize();
    const currentFolderSize = await this.getWorkspaceSize();

    if (!currentFileSize && !currentFolderSize) {
      this.fileSizeItem = null;
      return;
    }
    this.fileSizeItem = this.createStatusBarItem();

    if (this.fileSizeItem) {
      const text = [];
      if (currentFileSize) {
        text.push(`$(file) ${currentFileSize}`);
      }
      if (currentFolderSize) {
        text.push(`$(folder) ${currentFolderSize ?? 0}`);
      }

      this.fileSizeItem.text = text.join(' | ');
    }
  }

  getFileSize() {
    const currentFile = vscode.window.activeTextEditor?.document;
    if (!currentFile) {
      return undefined;
    }

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(currentFile.lineCount - 1, 0),
    );

    return filesize(currentFile.getText(range).length);
  }

  async getWorkspaceSize() {
    if (!vscode.workspace.workspaceFolders) {
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

  async getFolderSize(uri: vscode.Uri) {
    const ignoreNodeModules = this.configuration.get('ignoreNodeModules');

    const { fs } = vscode.workspace;

    const ignore = ignoreNodeModules ? /node_modules/g.test : () => true;

    const dir = (await fs.readDirectory(uri)).filter(([name]) => !ignore(name));

    const p: Promise<number>[] = dir.map(async ([name, type]) => {
      if (vscode.FileType[type]) {
        return await this.getFolderSize(vscode.Uri.joinPath(uri, name));
      }

      return (await fs.readFile(vscode.Uri.joinPath(uri, name))).length;
    });

    return p.reduce(
      (prev, curr) => prev.then((v) => curr.then((c) => v + c)),
      Promise.resolve(0),
    );
  }
}
