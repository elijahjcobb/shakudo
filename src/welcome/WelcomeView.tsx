/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as React from "react";
import "./WelcomeView.css"
import {Code as CodeIcon} from "@material-ui/icons";
import {Remote} from "electron";
const remote: Remote = window.require("electron").remote;

export interface WelcomeViewProps {

}

export interface WelcomeViewState {

}

export class WelcomeView extends React.Component<WelcomeViewProps, WelcomeViewState> {

	public constructor(props: WelcomeViewProps) {

		super(props);

		this.handleOpenFile = this.handleOpenFile.bind(this);

	}

	private handleOpenFile(): void {

		const paths = remote.dialog.showOpenDialogSync({
			properties: ["openFile"]
		});

		alert(paths);

	}

	public render(): React.ReactElement {
		return (<div className="WelcomeView">
			<div className={"header"}>
				<CodeIcon className="icon"/>
				<span className={"subTitle"}>Welcome to</span>
				<span className={"title"}>Blockloy</span>
			</div>
			<p>
				Blockloy is helpful block based editor for Alloy. Lorem ipsum dolor sit amet, consectetur adipiscing
				elit. Sed porttitor interdum tellus sit amet faucibus. Lorem ipsum dolor sit amet, consectetur
				adipiscing elit. Vestibulum non imperdiet velit. Nam porttitor velit at ligula convallis, a auctor
				justo tempus. Curabitur a ex sed augue imperdiet lobortis. Pellentesque mollis pharetra consectetur.
			</p>
			<div className={"actions"}>
				<span onClick={this.handleOpenFile} className={"open"}>Open Existing</span>
				<span className={"new"}>New</span>
			</div>
		</div>);
	}

}