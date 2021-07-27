import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

export default class Extension {
	fileSizeItem: vscode.StatusBarItem;
	configuration: vscode.WorkspaceConfiguration;

	constructor(public context: vscode.ExtensionContext) {
		this.updateStatusBar = this.updateStatusBar.bind(this);
		this.getFileSize = this.getFileSize.bind(this);
		this.getFolderSize = this.getFolderSize.bind(this);
		this.getWorkspaceSize = this.getWorkspaceSize.bind(this);
		this.updateConfiguration = this.updateConfiguration.bind(this);

		this.configuration = vscode.workspace.getConfiguration('fsMonitor');

		const alignmentConfig =
			this.configuration.get<'left' | 'right'>('position') || 'left';

		const alignment = alignmentConfig === 'right' ? 'Right' : 'Left';

		this.fileSizeItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment[alignment],
			100
		);

		vscode.workspace.onDidChangeConfiguration(this.updateConfiguration);

		context.subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(this.updateStatusBar),
			vscode.workspace.onDidSaveTextDocument(this.updateStatusBar),
			this.fileSizeItem
		);
		this.fileSizeItem.hide();

		this.updateStatusBar();

		console.log('Folder Size Monitor was successfully activated!');
	}

	async updateConfiguration(e: vscode.ConfigurationChangeEvent) {
		if (!e.affectsConfiguration('fsMonitor')) {
			return;
		}

		this.configuration = vscode.workspace.getConfiguration('fsMonitor');

		this.fileSizeItem.hide();
		this.fileSizeItem.dispose();

		const alignmentConfig =
			this.configuration.get<'left' | 'right'>('position') || 'left';

		const alignment = alignmentConfig === 'right' ? 'Right' : 'Left';

		this.fileSizeItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment[alignment],
			this.configuration.get<number>('priority')
		);
	}

	async updateStatusBar() {
		const currentFileSize = await this.getFileSize();
		const currentFolderSize = await this.getWorkspaceSize();

		console.log(currentFolderSize || 'Folder is undefined');
		console.log(currentFileSize || 'File is undefined');

		if (currentFileSize === undefined && currentFolderSize === undefined) {
			console.log('Both are undefined');
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
			return filesize(
				(await vscode.workspace.fs.stat(currentFile.uri)).size
			);
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

			return filesize(totalSize);
		} else {
			console.log(vscode.workspace.workspaceFolders[0].uri.fsPath);
			const folderSize = await this.getFolderSize(
				vscode.workspace.workspaceFolders[0].uri
			);

			console.log(filesize(folderSize));

			return filesize(folderSize);
		}
	}

	async getFolderSize(uri: vscode.Uri) {
		const ignoreNodeModules = vscode.workspace
			.getConfiguration('fsMonitor')
			.get<boolean>('ignoreNodeModules');

		const ffsConfig: ffs.Options | undefined = ignoreNodeModules
			? { ignore: /node_modules/g }
			: undefined;

		return ffs.loose(uri.fsPath, ffsConfig);
	}
}
