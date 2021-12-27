import React, {ReactNode} from "react";
import styled from "styled-components";

export type Option<T> = {
    label?: string | ReactNode
    data: T
    disabled?: boolean
}

const Div = styled.div`
    padding: 0.3em 0.5em;
    .radios-header: {
        font-weight: 'bold';
        margin-bottom: '0.4em';
    }
    .radio-options > label: {
        display: 'block';
        margin-bottom: 0;
    }
`

export function Radios<T extends string>(
    { label, options, choice, cb, children }: {
        label: string
        options: (Option<T> | T)[]
        choice: T
        cb: (choice: T) => void
        children?: ReactNode
    }
) {
    const labels = options.map(option => {
        const { label: text, data: name, disabled } =
            typeof option === 'string'
                ? { label: option, data: option, disabled: false }
                : { ...option, ...{ label: option.label === undefined ? option.data : option.label } }
        return (
            <label key={name}>
                <input
                    type="radio"
                    name={label + '-' + name}
                    value={name}
                    checked={name == choice}
                    disabled={disabled}
                    onChange={e => {
                    }}
                />
                {text}
            </label>
        )
    })
    return <Div className={"radios"}>
        <div className="radios-header">{label}:</div>
        <div id={label} className="radio-options" onChange={(e: any) => cb(e.target.value)}>{labels}</div>
        {children}
    </Div>
}
