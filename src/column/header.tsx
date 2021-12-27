import {Option, Radios} from "../control/radios";
import React, {FC} from "react";
import {CSS, Props} from "../tooltip";
import {stopPropagation} from "../utils";
import styled from "styled-components";

export type HeaderSettings<T extends string> = {
    options: (Option<T> | T)[]
    choice: T
    cb: (choice: T) => void
}

const SettingsIcon = styled.span`
    margin-right: 0.3rem;
    user-select: none;
`

const css: CSS = {
    '.radios': {
        padding: '0.3rem 0.5rem',
    },
    '.radios-header': {
        fontWeight: 'bold',
        marginBottom: '0.4rem',
    },
    '.radio-options > label': {
        display: 'block',
        marginBottom: 0,
    },
    'input[type=radio]': {
        margin: 'auto 0.3rem auto 0',
    },
}

export function Header<T extends string>(
    { label, headerSettings, Tooltip, }: {
        label: string
        headerSettings?: HeaderSettings<T>
        Tooltip: FC<Props>
    }
) {
    const body = (
        <span className={"header-span"}>
            {label}
        </span>
    )

    return (
        headerSettings
            ? (
                <Tooltip id={`column-${label}`} css={css} placement="bottom-start" title={
                    <div className={"settings-tooltip"} onClick={stopPropagation}>{
                        headerSettings
                            ? <Radios label={label} {...headerSettings} />
                            : <div>no choices available</div>
                    }</div>
                }>
                    {body}
                </Tooltip>
            )
            : body
    )
}
