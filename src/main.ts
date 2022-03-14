import vscode, { type StatusBarItem } from 'vscode';
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
    this.toggleOnOff = this.toggleOnOff.bind(this);

    // Event listeners and commands
    const events = [
      vscode.commands.registerCommand(
        'fsMonitor.toggleOnOff',
        this.toggleOnOff,
      ),
      vscode.workspace.onDidChangeConfiguration(this.updateConfiguration),
      vscode.window.onDidChangeActiveTextEditor(this.updateStatusBar),
      vscode.workspace.onDidChangeTextDocument(this.updateStatusBar),
    ];

    context.subscriptions.push(...events);

    // Initializes the status bar
    this.updateStatusBar();
  }

  private createStatusBarItem() {
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

    item.show();

    return item;
  }

  private toggleOnOff() {
    this.enabled = !this.enabled;

    this.updateStatusBar();
  }

  private updateConfiguration(e: vscode.ConfigurationChangeEvent) {
    if (!e.affectsConfiguration('fsMonitor')) {
      return;
    }

    this._enabled = this.configuration.get<boolean>('enabled') || false;

    this.updateStatusBar();
  }

  private async updateStatusBar() {
    const currentFileSize = await this.getFileSize();
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

  private async getFileSize() {
    const currentFile = vscode.window.activeTextEditor?.document;
    if (!currentFile) {
      return undefined;
    }

    const { fs } = vscode.workspace;
    const file = await fs.readFile(currentFile.uri);

    return filesize(file.length);
  }

  private async getWorkspaceSize() {
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
