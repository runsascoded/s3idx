import {Option, Radios} from "./radios";
import React, {FC} from "react";
import {PublicProps, Tooltip0, TooltipProps} from "./tooltip";
import {stopPropagation} from "./utils";
import styled from "styled-components";

const SettingsIcon = styled.span`
    margin-right: 0.3rem;
    user-select: none;
`

export type HeaderSettings<T extends string> = {
    options: (Option<T> | T)[]
    choice: T
    cb: (choice: T) => void
}

export function ColumnHeader<T extends string>(
    { label, headerSettings, Tooltip, }: {
        label: string
        headerSettings?: HeaderSettings<T>
        Tooltip: FC<PublicProps>
    }
) {
    return (
        <Tooltip id={`column-${label}`} key={"column-header"} placement="bottom-start" title={
            <div className="settings-tooltip" onClick={stopPropagation}>
                {
                    headerSettings
                        ? <Radios label={label} {...headerSettings} />
                        : <div>no choices available</div>
                }
            </div>
        }>
            <span className="header-span">
                <SettingsIcon>⚙️</SettingsIcon>
                {label}
            </span>
        </Tooltip>
    )
}
