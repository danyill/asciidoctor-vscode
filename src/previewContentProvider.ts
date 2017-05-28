/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { MarkdownEngine } from './markdownEngine';

import { Logger } from "./logger";

export interface ContentSecurityPolicyArbiter {
	isEnhancedSecurityDisableForWorkspace(rootPath: string): boolean;

	addTrustedWorkspace(rootPath: string): Thenable<void>;

	removeTrustedWorkspace(rootPath: string): Thenable<void>;
}

export function isMarkdownFile(document: vscode.TextDocument) {
	return document.languageId === 'asciidoc'
		&& document.uri.scheme !== 'asciidoc'; // prevent processing of own documents
}

export function getMarkdownUri(uri: vscode.Uri) {
	if (uri.scheme === 'asciidoc') {
		return uri;
	}

	return uri.with({
		scheme: 'asciidoc',
		path: uri.path + '.rendered',
		query: uri.toString()
	});
}

class MarkdownPreviewConfig {
	public static getCurrentConfig() {
		return new MarkdownPreviewConfig();
	}

	public readonly scrollBeyondLastLine: boolean;
	public readonly wordWrap: boolean;
	public readonly previewFrontMatter: string;
	public readonly doubleClickToSwitchToEditor: boolean;
	public readonly scrollEditorWithPreview: boolean;
	public readonly scrollPreviewWithEditorSelection: boolean;
	public readonly markEditorSelection: boolean;

	public readonly lineHeight: number;
	public readonly fontSize: number;
	public readonly fontFamily: string | undefined;
	public readonly styles: string[];

	private constructor() {
		const editorConfig = vscode.workspace.getConfiguration('editor');
		//const markdownConfig = vscode.workspace.getConfiguration('asciidoc');

		this.scrollBeyondLastLine = editorConfig.get<boolean>('scrollBeyondLastLine', false);
		this.wordWrap = editorConfig.get<string>('wordWrap', 'off') !== 'off';

	}

	public isEqualTo(otherConfig: MarkdownPreviewConfig) {
		for (let key in this) {
			if (this.hasOwnProperty(key) && key !== 'styles') {
				if (this[key] !== otherConfig[key]) {
					return false;
				}
			}
		}

		// Check styles
		if (this.styles.length !== otherConfig.styles.length) {
			return false;
		}
		for (let i = 0; i < this.styles.length; ++i) {
			if (this.styles[i] !== otherConfig.styles[i]) {
				return false;
			}
		}

		return true;
	}

	[key: string]: any;
}

export class MDDocumentContentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	private _waiting: boolean = false;

	private config: MarkdownPreviewConfig;

	private extraStyles: Array<vscode.Uri> = [];
	private extraScripts: Array<vscode.Uri> = [];

	constructor(
		private engine: MarkdownEngine,
		private logger: Logger
	) {
		this.config = MarkdownPreviewConfig.getCurrentConfig();
	}

	public addScript(resource: vscode.Uri): void {
		this.extraScripts.push(resource);
	}

	public addStyle(resource: vscode.Uri): void {
		this.extraStyles.push(resource);
	}



	public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
		const sourceUri = vscode.Uri.parse(uri.query);

		let initialLine: number | undefined = undefined;
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri.fsPath === sourceUri.fsPath) {
			initialLine = editor.selection.active.line;
		}

		return vscode.workspace.openTextDocument(sourceUri).then(document => {
			this.config = MarkdownPreviewConfig.getCurrentConfig();

			const initialData = {
				previewUri: uri.toString(),
				source: sourceUri.toString(),
				line: initialLine,
			};

			this.logger.log('provideTextDocumentContent', initialData);

			const body = this.engine.render(sourceUri, this.config.previewFrontMatter === 'hide', document.getText());
			return `<!DOCTYPE html>
				<html>
				<head>
					<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
					<base href="${document.uri.toString()}">
				</head>
				<body class="vscode-body ${this.config.scrollBeyondLastLine ? 'scrollBeyondLastLine' : ''} ${this.config.wordWrap ? 'wordWrap' : ''} ${this.config.markEditorSelection ? 'showEditorSelection' : ''}">
					${body}
					<div class="code-line" data-line="${document.lineCount}"></div>
				</body>
				</html>`;
		});
	}

	public updateConfiguration() {
		const newConfig = MarkdownPreviewConfig.getCurrentConfig();
		if (!this.config.isEqualTo(newConfig)) {
			this.config = newConfig;
			// update all generated md documents
			vscode.workspace.textDocuments.forEach(document => {
				if (document.uri.scheme === 'asciidoc') {
					this.update(document.uri);
				}
			});
		}
	}

	get onDidChange(): vscode.Event<vscode.Uri> {
		return this._onDidChange.event;
	}

	public update(uri: vscode.Uri) {
		if (!this._waiting) {
			this._waiting = true;
			setTimeout(() => {
				this._waiting = false;
				this._onDidChange.fire(uri);
			}, 300);
		}
	}
}
