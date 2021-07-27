import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

export default class Extension {
	fileSizeItem: vscode.StatusBarItem;
	constructor(public context: vscode.ExtensionContext) {
		this.updateStatusBar = this.updateStatusBar.bind(this);
		this.getFileSize = this.getFileSize.bind(this);
		this.getFolderSize = this.getFolderSize.bind(this);

		this.fileSizeItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100
		);

		context.subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(this.updateStatusBar),
			vscode.workspace.onDidSaveTextDocument(this.updateStatusBar),
			this.fileSizeItem
		);
		this.fileSizeItem.hide();

		this.updateStatusBar();

		console.log('Folder Size Monitor was successfully activated!');
	}

	async updateStatusBar() {
		const currentFileSize = await this.getFileSize();
		const currentFolderSize = await this.getFolderSize();

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

	async getFolderSize(): Promise<string | undefined> {
		if (vscode.workspace.workspaceFolders === undefined) {
			return undefined;
		} else if (vscode.workspace.workspaceFolders.length !== 1) {
			const totalSize = await vscode.workspace.workspaceFolders.reduce(
				async (prev, folder) =>
					(await prev) + (await ffs(folder.uri.fsPath)).size,
				Promise.resolve(0)
			);

			return filesize(totalSize);
		} else {
			console.log(vscode.workspace.workspaceFolders[0].uri.fsPath);
			const folderSize = (
				await ffs(vscode.workspace.workspaceFolders[0].uri.fsPath)
			).size;

			console.log(filesize(folderSize));

			return filesize(folderSize);
		}
	}
}
