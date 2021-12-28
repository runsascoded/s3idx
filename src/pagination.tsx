import React, {useEffect} from "react";
import styled from "styled-components";
import {Button, DivRow} from "./style";
import { Set } from "./utils";
import {useQueryParam} from "use-query-params";
import {intParam, stringParam} from "./search-params";
import createPersistedState from "use-persisted-state";

const { ceil, max } = Math

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

export interface State {
    numChildren?: number
    pageIdx: number
    pageSize: number
    setPageSize: Set<number>
    numPages?: number
    pageIdxStr: string
    setPageIdxStr: Set<string>
    cantPrv: boolean
    cantNxt: boolean
}

export interface Props {
    start: number
    end: number
}

export const PaginationRow = (
    {
        state: {
            numChildren,
            pageIdx,
            pageIdxStr, setPageIdxStr,
            pageSize, setPageSize,
            numPages,
            cantPrv, cantNxt,
        },
        start, end,
    }: { state: State } & Props
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

const usePageIdx = createPersistedState('pageIdx')
const usePageSize = createPersistedState('pageSize')
const usePaginationInfoInURL = createPersistedState('paginationInfoInURL')

export function makePagination(
    { numChildren, config }: {
        numChildren?: number
        config: {
            paginationInfoInURL: boolean
            pageSize: number
        }
    }
): State {
    const [ paginationInfoInURL, ] = usePaginationInfoInURL(config.paginationInfoInURL)
    const [ pageSize, setPageSize ] = paginationInfoInURL ?
        useQueryParam('s', intParam(config.pageSize)) :
        usePageSize<number>(config.pageSize)
    const numPages = numChildren === undefined ? undefined : max(1, ceil(numChildren / pageSize))

    const [ pageIdxStr, setPageIdxStr ] = paginationInfoInURL ?
        useQueryParam('p', stringParam('1')) :
        usePageIdx('1')
    let pageIdx = parseInt(pageIdxStr)
    if (pageIdx > 0) pageIdx -= 1
    let callSetPageIdx: number | undefined
    if (isNaN(pageIdx)) {
        pageIdx = 0
    }
    if (pageIdx < 0) {
        if (numPages === undefined) {
            console.log(`Negative page index ${pageIdx}, but don't know numPages yet`)
            pageIdx = 0
        } else {
            if (pageIdx < -numPages) {
                pageIdx = 0
                callSetPageIdx = pageIdx
            } else {
                pageIdx = numPages + pageIdx
            }
            console.log(`Mapped negative page index ${pageIdxStr} to ${pageIdx}`)
        }
    }
    if (numPages !== undefined && pageIdx >= numPages) {
        pageIdx = numPages - 1
        callSetPageIdx = pageIdx
    }

    useEffect(
        () => {
            if (callSetPageIdx !== undefined) {
                setPageIdxStr(toPageIdxStr(callSetPageIdx))
            }
        },
        [ callSetPageIdx, ]
    )
    // console.log(`** Initializing, bucket ${bucket} key ${key}, page ${pageIdx}/${numPages} ⨉ ${pageSize}`)

    const cantPrv = pageIdx == 0
    const cantNxt = numPages === undefined || pageIdx + 1 == numPages

    return {
        numChildren,
        pageIdx,
        pageIdxStr, setPageIdxStr,
        pageSize, setPageSize,
        numPages,
        cantPrv, cantNxt,
    }
}
