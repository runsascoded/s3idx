import React from "react";
import styled from "styled-components";
import {Button, DivRow} from "./style";
import { Set } from "./utils";

// Pagination / Cache controls

const Row = styled(DivRow)`
    margin-top: 1em;
    line-height: 1.2em;
`
const PaginationButton = styled(Button)`
    margin-left: 0em;
    margin-right: 0.2em;
`
const PageNumber = styled.span`
    margin-left: 0.5em;
    margin-right: 0.5em;
`
const GotoPage = styled.input`
    width: 2.6em;
    text-align: right;
    padding: 0.2em 0;
    border: 0;
`
const PageSizeSelect = styled.select`
    padding: 0.2em 0.1em;
    border: 0;
`
const NumChildrenContainer = styled.span`
    margin-top: auto;
    margin-bottom: auto;
`
const NumChildren = styled.span``

export function toPageIdxStr(idx: number) {
    return (idx >= 0 ? (idx + 1) : idx).toString()
}

interface Props {
    pageIdx: number
    pageSize: number
    setPageSize: Set<number>
    numPages?: number
    pageIdxStr: string
    setPageIdxStr: Set<string>
    cantPrv: boolean
    cantNxt: boolean
    start: number
    end: number
    numChildren?: number
}

export const PaginationRow = (
    {
        pageIdx, pageIdxStr, setPageIdxStr,
        pageSize, setPageSize,
        numPages,
        cantPrv, cantNxt,
        start, end, numChildren,
    }: Props
) => {
    return (
        <Row>
            {
                numPages !== 1
                && (
                    <span className={"pagination-controls"}>
                                <span className={"pagination-buttons"}>
                                    <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(0))} disabled={cantPrv}>{'<<'}</PaginationButton>{' '}
                                    <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(pageIdx - 1))} disabled={cantPrv}>{'<'}</PaginationButton>{' '}
                                    <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(pageIdx + 1))} disabled={cantNxt}>{'>'}</PaginationButton>{' '}
                                    <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr((numPages || 0) - 1))} disabled={cantNxt}>{'>>'}</PaginationButton>{' '}
                                </span>
                            </span>
                )
            }
            <PageNumber>
                Page
                <GotoPage
                    type="number"
                    value={pageIdxStr}
                    onChange={e => setPageIdxStr(e.target.value || '')}
                />
                <span>of {numPages === null ? '?' : numPages}</span>{' ⨉'}
                <PageSizeSelect
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                >
                    {[10, 20, 50, 100].map(pageSize =>
                        <option key={pageSize} value={pageSize}>{pageSize}</option>
                    )}
                </PageSizeSelect>
            </PageNumber>
            {
                numChildren !== null &&
                <NumChildrenContainer>
                    {' '}<span className={"control-separator"}>|</span>{' '}
                    <NumChildren>
                        Children {start + 1} – {end} of {numChildren}
                    </NumChildren>
                </NumChildrenContainer>
            }
        </Row>
    )
}
