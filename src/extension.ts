import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { dirname } from 'path';

const SUCCESS = 'success';
const FAILURE = 'failure';
const ERROR = 'error';

type TestStatus = typeof SUCCESS | typeof FAILURE | typeof ERROR;

interface TestResult {
	status: TestStatus;
	message: string;
}

interface TestOutput {
	[lineNumber: string]: TestResult;
}

const successDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(0, 255, 0, 0.3)'
});

const failureDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(255, 0, 0, 0.3)'
});

const errorDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(255, 255, 0, 0.3)'
});


export function activate(context: vscode.ExtensionContext): void {
	
	const runTest = vscode.commands.registerCommand('school-grader.runTest', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}

		const extension = vscode.extensions.getExtension('ms-python.python');
		if (!extension) {
			vscode.window.showErrorMessage('Python extension not found');
			return;
		}

		if (!extension.isActive) {
			await extension.activate();
		}

		const pythonPath = extension.exports.settings.getExecutionDetails().execCommand[0];
		if (!pythonPath) {
			vscode.window.showErrorMessage('Python path not found');
			return;
		}

		const scriptPath = editor.document.uri.fsPath;
		const scriptCwd = dirname(scriptPath);

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Running tests...',
		}, async () => {
			const testOutput: TestOutput = await runTests(scriptPath, pythonPath, scriptCwd);
			decorateEditor(editor, testOutput);
			vscode.window.showInformationMessage('Tests completed.');
		});
	});

	const clearTest = vscode.commands.registerCommand('school-grader.clearTest', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}

		clearDecorations(editor);
		vscode.window.showInformationMessage('Screen cleared');
	});

	context.subscriptions.push(runTest);
	context.subscriptions.push(clearTest);
}

async function runTests(scriptPath: string, pythonPath: string, cwd: string): Promise<TestOutput> {
	return new Promise<TestOutput>((resolve, reject) => {
		const process = spawn(pythonPath, [scriptPath, '--extension'], { cwd });
		if(!process) {
			vscode.window.showErrorMessage('Error with response from test. Please check that you have school-grader installed.');
			return reject();
		}

		const datas: string[] = [];
		process.stdout.on('data', (data: Buffer) => {
			datas.push(`${data}`);
		});

		process.on('exit', () => {
			const output: string | undefined = datas.pop();
			if (!output) {
				vscode.window.showErrorMessage('Error with response from test. Please check that you have school-grader installed.');
				return reject();
			}

			try {
				const jsonObject: TestOutput = JSON.parse(output);
				resolve(jsonObject);
			} catch (e) {
				vscode.window.showErrorMessage('Error with response from test. Please check that you have school-grader installed.');
				return reject();
			}
		});
	});
}

function decorateEditor(editor: vscode.TextEditor, testOutput: TestOutput): void {
	const successDecorations: vscode.DecorationOptions[] = [];
	const failureDecorations: vscode.DecorationOptions[] = [];
	const errorDecorations: vscode.DecorationOptions[] = [];

	for (const [lineNumberStr, result] of Object.entries(testOutput)) {
		try{
			const lineNumber = parseInt(lineNumberStr, 10);
			const line = editor.document.lineAt(lineNumber - 1);
			const range = new vscode.Range(line.range.start, line.range.end);
			const decoration = {
				range,
				hoverMessage: result.message,
			};

			switch (result.status) {
				case SUCCESS:
					successDecorations.push(decoration);
					break;
				case FAILURE:
					failureDecorations.push(decoration);
					break;
				case ERROR:
					errorDecorations.push(decoration);
					break;
			}

		}catch(e: unknown){
			vscode.window.showErrorMessage('Error with response from test');
			return;
		}
		
	}

	editor.setDecorations(successDecorationType, successDecorations);
	editor.setDecorations(failureDecorationType, failureDecorations);
	editor.setDecorations(errorDecorationType, errorDecorations);
}

function clearDecorations(editor: vscode.TextEditor): void {
	editor.setDecorations(successDecorationType, []);
	editor.setDecorations(failureDecorationType, []);
	editor.setDecorations(errorDecorationType, []);
}
