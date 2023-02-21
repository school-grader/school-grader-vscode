import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { dirname } from 'path';



export function activate(context: vscode.ExtensionContext) {

	// Define the decoration type for success
	let successDecorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(0, 255, 0, 0.3)'
	});

	// Define the decoration type for failure
	let failureDecorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255, 0, 0, 0.3)'
	});

	// Define the decoration type for error
	let errorDecorationType = vscode.window.createTextEditorDecorationType({
    	backgroundColor: 'rgba(255, 255, 0, 0.3)'
	});

	let runTest = vscode.commands.registerCommand('school-grader.runTest', async () => {
		const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }
		
		const extension = vscode.extensions.getExtension('ms-python.python');
		if(!extension) {
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

		let scriptPath = editor.document.uri.fsPath;
		let scriptCwd = dirname(scriptPath);

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification
		}, async (progress) => {

			progress.report({ message: "Running tests..." });

			await new Promise<void>((resolve, reject) => {
				
				let process = spawn(pythonPath, [scriptPath, '--extension'], { cwd: scriptCwd });

				const datas: string[] = [];
				process.stdout.on('data', data => {
					datas.push(`${data}`);
				});
		
				process.on('exit', () => {
					let output = datas.pop();
					if(!output) {
						vscode.window.showErrorMessage('Error with response from test. Please check that you have school-grader-grader installed.');
						return reject();
					}
					let jsonObject: any;
					try{
						jsonObject = JSON.parse(output);
					}catch(e){
						vscode.window.showErrorMessage('Error with response from test. Please check that you have school-grader-grader installed.');
						return reject();
					}
		
					let lineNumbers = Object.keys(jsonObject).map((key) => parseInt(key, 10));

					const getDecorationsByStatus = (status: string) => {
						return lineNumbers
						  .filter((lineNumber) => jsonObject[lineNumber].status === status)
						  .map((lineNumber) => {
							const line = editor.document.lineAt(lineNumber - 1);
							return {
							  range: new vscode.Range(line.range.start, line.range.end),
							  hoverMessage: jsonObject[lineNumber].message,
							};
						  });
					  };
		
					const successDecorations = getDecorationsByStatus('success');
					const failureDecorations = getDecorationsByStatus('failure');
					const errorDecorations = getDecorationsByStatus('error');
					
					// Apply the decorations to the active text editor
					editor.setDecorations(successDecorationType, successDecorations);
					editor.setDecorations(failureDecorationType, failureDecorations);
					editor.setDecorations(errorDecorationType, errorDecorations);
					return resolve();
					
				});
	
			});

			vscode.window.showInformationMessage('Tests completed.');
			
		});
	
	});

	context.subscriptions.push(runTest);


	let clearTest = vscode.commands.registerCommand('school-grader.clearTest', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		editor.setDecorations(successDecorationType, []);
		editor.setDecorations(failureDecorationType, []);
		editor.setDecorations(errorDecorationType, []);
		vscode.window.showInformationMessage('Screen cleared');
	});

	context.subscriptions.push(clearTest);
}