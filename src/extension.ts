// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from 'vscode';
import ffs from 'get-folder-size';
import filesize from 'filesize';

let testStatusBarItem: vscode.StatusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "foldersizemonitor" is now active!'
	);

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

	const fileChangeEvent =
		vscode.workspace.onDidOpenTextDocument(updateStatusBar);

	const fileSaveEvent =
		vscode.workspace.onDidSaveTextDocument(updateStatusBar);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(
		'foldersizemonitor.helloWorld',
		() => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage(
				'Hello VSCode from FolderSizeMonitor!'
			);
		}
	);

	context.subscriptions.push(
		disposable,
		fileChangeEvent,
		fileSaveEvent,
		testStatusBarItem
	);
	testStatusBarItem.hide();
}

async function updateStatusBar(e: vscode.TextDocument) {
	try {
		testStatusBarItem.show();

		const currentFileSize = await getFileSize(e);
		const currentFolderSize = await getFolderSize();

		if (!currentFileSize) {
			testStatusBarItem.text = `$(file) ${currentFileSize}`;
			return;
		}
		testStatusBarItem.text = `$(file) ${currentFileSize} | $(file-directory) ${
			currentFolderSize || '0'
		}`;
	} catch (e) {
		console.error(e);
	}
}

async function getFileSize(e: vscode.TextDocument): Promise<string> {
	return filesize((await vscode.workspace.fs.stat(e.uri)).size);
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
