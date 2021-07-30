import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

export default class Extension {
	fileSizeItem: vscode.StatusBarItem;
	configuration: vscode.WorkspaceConfiguration;
	oldFileSize = '0 B';
	oldDirSize = '0 B';
	enabled: boolean;
	idName = 'fsMonitor';
	displayName = 'FS Monitor';

	constructor(public context: vscode.ExtensionContext) {
		// Bindings so anything done in the following functions is done in the context of the extension
		this.updateStatusBar = this.updateStatusBar.bind(this);
		this.getFileSize = this.getFileSize.bind(this);
		this.getFolderSize = this.getFolderSize.bind(this);
		this.getWorkspaceSize = this.getWorkspaceSize.bind(this);
		this.updateConfiguration = this.updateConfiguration.bind(this);
		this.toggleOnOff = this.toggleOnOff.bind(this);

		// Sets the configuration to the users configuration
		this.configuration = vscode.workspace.getConfiguration(this.idName);

		this.enabled = this.configuration.get<boolean>('enabled') || false;

		// Creates the status bar item and uses the values from config
		this.createStatusBarItem();

		const toggleOnOffCommand = vscode.commands.registerCommand(
			`${this.idName}.toggleOnOff`,
			this.toggleOnOff
		);

		this.fileSizeItem = this.createStatusBarItem();

		// Event listeners
		const events = [
			vscode.workspace.onDidChangeConfiguration(this.updateConfiguration),
			vscode.window.onDidChangeActiveTextEditor(this.updateStatusBar),
			vscode.workspace.onDidSaveTextDocument(this.updateStatusBar),
		];

		context.subscriptions.push(
			...events,
			toggleOnOffCommand,
			this.fileSizeItem
		);
		this.fileSizeItem.hide();

		// Initializes the status bar
		this.updateStatusBar();

		console.log(`${this.displayName} was successfully activated!`);
	}

	createStatusBarItem() {
		const alignmentConfig =
			this.configuration.get<'left' | 'right'>('position') || 'left';

		const alignment = alignmentConfig === 'right' ? 'Right' : 'Left';

		const item = vscode.window.createStatusBarItem(
			`${this.idName}.fileSizeStatus`,
			vscode.StatusBarAlignment[alignment],
			this.configuration.get<number>('priority')
		);

		item.command = `${this.idName}.toggleOnOff`;
		item.tooltip = `Toggle ${this.displayName} On/Off`;

		if (!this.enabled) {
			item.text = 'Disabled';
			item.backgroundColor = new vscode.ThemeColor(
				'statusBarItem.errorBackground'
			);
			console.log(`${this.displayName} has been disabled!`);
		}

		return item;
	}

	async toggleOnOff() {
		this.configuration.update('enabled', !this.enabled);
		if (this.enabled) {
			this.enabled = false;
			this.fileSizeItem.text = 'Disabled';
			this.fileSizeItem.backgroundColor = new vscode.ThemeColor(
				'statusBarItem.errorBackground'
			);
			console.log(`${this.displayName} has been disabled!`);
		} else {
			this.enabled = true;
			this.fileSizeItem.backgroundColor = undefined;
			this.fileSizeItem.text = 'Enabling...';
			this.updateStatusBar();
			console.log(`${this.displayName} has been enabled!`);
		}
	}

	async updateConfiguration(e: vscode.ConfigurationChangeEvent) {
		if (!e.affectsConfiguration(this.idName)) {
			return;
		}

		this.configuration = vscode.workspace.getConfiguration(this.idName);

		this.fileSizeItem.hide();
		this.fileSizeItem.dispose();

		// TODO Fix workspace config not properly disabling extension
		this.enabled = this.configuration.get<boolean>('enabled') || false;

		this.fileSizeItem = this.createStatusBarItem();

		return this.updateStatusBar();
	}

	async updateStatusBar() {
		if (!this.enabled) {
			return this.fileSizeItem.show();
		}

		const currentFileSize = await this.getFileSize();

		const currentFolderSize = await this.getWorkspaceSize();

		if (currentFileSize === undefined && currentFolderSize === undefined) {
			return this.fileSizeItem.hide();
		} else if (
			currentFolderSize === undefined &&
			currentFileSize !== undefined
		) {
			this.fileSizeItem.text = `$(file) ${currentFileSize}`;
		} else if (
			currentFileSize === undefined &&
			currentFolderSize !== undefined
		) {
			this.fileSizeItem.text = `$(file-directory) ${currentFolderSize}`;
		} else {
			this.fileSizeItem.text = `$(file) ${currentFileSize} | $(file-directory) ${
				currentFolderSize || '0'
			}`;
		}

		this.fileSizeItem.show();
	}

	async getFileSize(): Promise<string | undefined> {
		const currentFile = vscode.window.activeTextEditor?.document;
		if (currentFile === undefined) {
			return undefined;
		} else if (!currentFile.uri.fsPath.endsWith('.git')) {
			const size = filesize(
				(await vscode.workspace.fs.stat(currentFile.uri)).size
			);
			this.oldFileSize = size;
			return size;
		} else {
			return undefined;
		}
	}

	async getWorkspaceSize(): Promise<string | undefined> {
		if (vscode.workspace.workspaceFolders === undefined) {
			return undefined;
		} else if (vscode.workspace.workspaceFolders.length !== 1) {
			const totalSize = await vscode.workspace.workspaceFolders.reduce(
				async (prev, folder) =>
					(await prev) + (await this.getFolderSize(folder.uri)),
				Promise.resolve(0)
			);

			const size = filesize(totalSize);
			this.oldDirSize = size;

			return size;
		} else {
			const folderSize = await this.getFolderSize(
				vscode.workspace.workspaceFolders[0].uri
			);

			const size = filesize(folderSize);
			this.oldDirSize = size;

			return size;
		}
	}

	async getFolderSize(uri: vscode.Uri) {
		const ignoreNodeModules = vscode.workspace
			.getConfiguration(this.idName)
			.get<boolean>('ignoreNodeModules');

		const ffsConfig: ffs.Options | undefined = ignoreNodeModules
			? { ignore: /node_modules/g }
			: undefined;

		return ffs.loose(uri.fsPath, ffsConfig);
	}
}
