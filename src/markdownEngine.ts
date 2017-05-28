/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';

export interface IToken {
	type: string;
	map: [number, number];
}

interface MarkdownIt {
	render(text: string): string;

	parse(text: string, env: any): IToken[];

	utils: any;
}

const FrontMatterRegex = /^---\s*[^]*?(-{3}|\.{3})\s*/;

export class MarkdownEngine {
	private md: MarkdownIt;

	private firstLine: number;

	private currentDocument: vscode.Uri;

	private plugins: Array<(md: any) => any> = [];

	public addPlugin(factory: (md: any) => any): void {
		if (this.md) {
			this.usePlugin(factory);
		} else {
			this.plugins.push(factory);
		}
	}

	private usePlugin(factory: (md: any) => any): void {
		try {
			this.md = factory(this.md);
		} catch (e) {
			// noop
		}
	}

	private get engine() {
		return null;
	}

	private stripFrontmatter(text: string): { text: string, offset: number } {
		let offset = 0;
		const frontMatterMatch = FrontMatterRegex.exec(text);
		if (frontMatterMatch) {
			const frontMatter = frontMatterMatch[0];
			offset = frontMatter.split(/\r\n|\n|\r/g).length - 1;
			text = text.substr(frontMatter.length);
		}
		return { text, offset };
	}

	public render(document: vscode.Uri, stripFrontmatter: boolean, text: string): string {
		let offset = 0;
		if (stripFrontmatter) {
			const markdownContent = this.stripFrontmatter(text);
			offset = markdownContent.offset;
			text = markdownContent.text;
		}
		this.currentDocument = document;
		this.firstLine = offset;
		return(text);
		//return this.engine.render(text);
	}

	
}