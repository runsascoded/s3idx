import styled, {css} from "styled-components";
import {Container as BootstrapContainer, Row as BootstrapRow} from "react-bootstrap";

// Container / Row styles

export const Container = styled(BootstrapContainer)`
    margin-bottom: 2rem;
    code {
        font-size: 1em;
        margin: 0 0.3rem;
    }
    h2 {
        font-size: 1.6em;
        margin-top: 0.4em;
    }
    h3 {
        font-size: 1.4em;
        margin-top: 0.7em;
    }
    h4 {
        font-size: 1.2em;
        margin-top: 0.7em;
    }
`

export const RowStyle = css`
    padding 0 2rem;
`
export const DivRow = styled(BootstrapRow)`
    ${RowStyle}
`
export const CodeBlock = styled.pre`
    margin-left: 2em;
    background: #f8f8f8;
    padding: 0.6em 1.1em;
`
export const Button = styled.button`
    padding: 0.2em 0.4em;
    border: 1px solid #bbb;
    cursor: pointer;
    box-sizing: border-box;
`

export const SettingsLabel = css`
    font-size: 2em;
    cursor: pointer;
    user-select: none;
    padding: 0;
    margin: auto 0.1em;
    line-height: 1em;
`
