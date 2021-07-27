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
	testStatusBarItem.text = 'Loading...';

	// Figure out the right event so it's not just when you open a new, unopened file
	const fileChangeEvent = vscode.window.onDidChangeActiveTextEditor(e =>
		updateStatusBar(e?.document)
	);

	const fileSaveEvent =
		vscode.workspace.onDidSaveTextDocument(updateStatusBar);

	context.subscriptions.push(
		fileChangeEvent,
		fileSaveEvent,
		testStatusBarItem
	);
	testStatusBarItem.hide();

	updateStatusBar(vscode.window.activeTextEditor?.document);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Folder Size Monitor was successfully activated!');
}

async function updateStatusBar(e: vscode.TextDocument | undefined) {
	try {
		if (e === undefined) return testStatusBarItem.hide();

		const currentFileSize = await getFileSize(e);
		const currentFolderSize = await getFolderSize();

		if (currentFileSize === undefined) return;
		if (!currentFileSize)
			return (testStatusBarItem.text = `$(file) ${currentFileSize}`);

		testStatusBarItem.text = `$(file) ${currentFileSize} | $(file-directory) ${
			currentFolderSize || '0'
		}`;

		testStatusBarItem.show();
	} catch (e) {
		console.error(e);
	}
}

async function getFileSize(
	e: vscode.TextDocument
): Promise<string | undefined> {
	if (!e.uri.fsPath.endsWith('.git')) {
		return filesize((await vscode.workspace.fs.stat(e.uri)).size);
	} else {
		return undefined;
	}
}

async function getFolderSize(): Promise<string | undefined> {
	if (vscode.workspace.workspaceFolders === undefined) {
		return undefined;
	} else if (vscode.workspace.workspaceFolders.length !== 1) {
		let totalSize = 0;

		for (const folder of vscode.workspace.workspaceFolders) {
			totalSize += (await ffs(folder.uri.fsPath)).size;
		}

		return filesize(totalSize);
	} else {
		const folderSize = (
			await ffs(vscode.workspace.workspaceFolders[0].uri.fsPath)
		).size;

		return filesize(folderSize);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
