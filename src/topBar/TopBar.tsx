/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as React from "react";
import "./TopBar.css";
import {Close as CloseIcon, Remove as RemoveIcon, Code as CodeIcon} from "@material-ui/icons";

import {Remote} from "electron";
const remote: Remote = window.require("electron").remote;


export interface TopBarProps {

}

export interface TopBarState {

}

export class TopBar extends React.Component<TopBarProps, TopBarState> {


	public constructor(props: TopBarProps) {

		super(props);
		this.state = {};

		this.handleClose = this.handleClose.bind(this);
		this.handleMinimize = this.handleMinimize.bind(this);

	}

	private handleMinimize(): void {
		remote.getCurrentWindow().minimize();
	}

	private handleClose(): void {
		remote.getCurrentWindow().close();
	}

	public render(): React.ReactElement {

		return (<div className={"TopBar"}>
			<CodeIcon/>
			<span className={"title"}>Blockloy</span>
			<div className={"navButtons"}>
				<div className="minimizeContainer" onClick={this.handleMinimize}><RemoveIcon className={"minimize"}/></div>
				<div className="closeContainer" onClick={this.handleClose}><CloseIcon className={"close"}/></div>
			</div>
		</div>);

	}
}