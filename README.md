# School Grader

A Visual Studio Code extension that allows you to run and grade your code in the editor.

## Features

- Runs the code in the active text editor and highlights the lines that have been successfully executed, failed or caused errors.
- The status of each line is displayed as a background color: green for success, red for failure, and yellow for error.
- The results of the test can be displayed as hover messages on the code.

## Requirements

- Python official extension must be install
- The [school-grader](https://pypi.org/project/school-grader/) package must be installed from pypi `pip install school-grader`

## Usage

1. Open a file with a run_tests()
2. Use the extension using the Run test button.
3. The code in the active text editor will be executed, and the results will be displayed as decorations in the editor.
4. To clear the decorations, use the eraser button.