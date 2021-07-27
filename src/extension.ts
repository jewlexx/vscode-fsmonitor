// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as humanize from 'humanize';

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

	const fileChangeEvent = vscode.workspace.onDidOpenTextDocument(async e => {
		testStatusBarItem.show();
		const fileStat = await vscode.workspace.fs.stat(e.uri);

		console.log(fileStat.size);

		testStatusBarItem.text = `$(file) ${fileStat.size.toString()} | $(file-directory) 69 hehe`;
	});

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

	context.subscriptions.push(disposable, fileChangeEvent, testStatusBarItem);
}

// this method is called when your extension is deactivated
export function deactivate() {}
