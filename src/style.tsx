import styled, {css} from "styled-components";
import {Row as BootstrapRow} from "react-bootstrap";

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
