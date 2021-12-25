import {Option, Radios} from "./radios";
import * as mui from "@mui/material";
import {Tooltip, tooltipClasses, TooltipProps} from "@mui/material";
import React from "react";
import {stopPropagation} from "./utils";
import styled from "styled-components";

const SettingsIcon = styled.span`
    margin-right: 0.3rem;
`

export type HeaderSettings<T extends string> = {
    options: (Option<T> | T)[]
    choice: T
    cb: (choice: T) => void
}

export const ColumnHeaderTooltip = mui.styled(
    ({ className, ...props }: TooltipProps) => <Tooltip {...props} classes={{ popper: className }} />
)(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white,
        fontSize: '1rem',
        marginBottom: '0.2rem',
    },
    '.settings-tooltip': {
        margin: '0.3rem 0',
    },
    '.control-header': {
        fontWeight: 'bold',
        marginBottom: '0.4rem',
    },
    '.sub-control > label': {
        display: 'block',
        marginBottom: 0,
    }
}));

export function ColumnHeader<T extends string>(
    label: string,
    headerSettings?: HeaderSettings<T>,
) {
    const body: JSX.Element =
        headerSettings ?
            <Radios label={label} {...headerSettings} /> :
            <div>no choices available</div>

    return (
        <ColumnHeaderTooltip disableFocusListener arrow placement="bottom-start" title={
            <div className="settings-tooltip" onClick={stopPropagation}>
                {body}
            </div>
        }>
            <span className="header-span">
                <SettingsIcon>⚙️</SettingsIcon>
                {label}
            </span>
        </ColumnHeaderTooltip>
    )
}
