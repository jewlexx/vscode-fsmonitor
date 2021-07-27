// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

let statusBarSize: vscode.StatusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	statusBarSize = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100
	);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
		vscode.workspace.onDidSaveTextDocument(updateStatusBar),
		statusBarSize
	);
	statusBarSize.hide();

	updateStatusBar();

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Folder Size Monitor was successfully activated!');
}

async function updateStatusBar() {
	const currentFileSize = await getFileSize();
	const currentFolderSize = await getFolderSize();

	console.log(currentFolderSize || 'Folder is undefined');
	console.log(currentFileSize || 'File is undefined');

	if (currentFileSize === undefined && currentFolderSize === undefined) {
		console.log('Both are undefined');
		return statusBarSize.hide();
	} else if (
		currentFolderSize === undefined &&
		currentFileSize !== undefined
	) {
		statusBarSize.text = `$(file) ${currentFileSize}`;
	} else if (
		currentFileSize === undefined &&
		currentFolderSize !== undefined
	) {
		statusBarSize.text = `$(file-directory) ${currentFolderSize}`;
	} else {
		statusBarSize.text = `$(file) ${currentFileSize} | $(file-directory) ${
			currentFolderSize || '0'
		}`;
	}

	statusBarSize.show();
}

async function getFileSize(): Promise<string | undefined> {
	const currentFile = vscode.window.activeTextEditor?.document;
	if (currentFile === undefined) {
		return undefined;
	} else if (!currentFile.uri.fsPath.endsWith('.git')) {
		return filesize((await vscode.workspace.fs.stat(currentFile.uri)).size);
	} else {
		return undefined;
	}
}

async function getFolderSize(): Promise<string | undefined> {
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

// this method is called when your extension is deactivated
export function deactivate() {}
