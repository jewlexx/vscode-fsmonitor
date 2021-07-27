// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

let testStatusBarItem: vscode.StatusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage(
		'Hello VSCode from FolderSizeMonitor!'
	);

	if (vscode.workspace.name === undefined) {
		console.log('Not currently in a workspace');
	} else {
		console.log(vscode.workspace.workspaceFolders);
	}

	testStatusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100
	);

	// Figure out the right event so it's not just when you open a new, unopened file
	const fileChangeEvent =
		vscode.window.onDidChangeActiveTextEditor(updateStatusBar);

	const fileSaveEvent =
		vscode.workspace.onDidSaveTextDocument(updateStatusBar);

	context.subscriptions.push(
		fileChangeEvent,
		fileSaveEvent,
		testStatusBarItem
	);
	testStatusBarItem.hide();

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
		return testStatusBarItem.hide();
	} else if (
		currentFolderSize === undefined &&
		currentFileSize !== undefined
	) {
		testStatusBarItem.text = `$(file) ${currentFileSize}`;
	} else if (
		currentFileSize === undefined &&
		currentFolderSize !== undefined
	) {
		testStatusBarItem.text = `$(file-directory) ${currentFolderSize}`;
	} else {
		testStatusBarItem.text = `$(file) ${currentFileSize} | $(file-directory) ${
			currentFolderSize || '0'
		}`;
	}

	testStatusBarItem.show();
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
