import React, {useCallback, useEffect, useMemo, useState,} from "react";
import moment, {Duration} from 'moment'
import {Link, useNavigate, useParams} from "react-router-dom";
import _ from "lodash";
import useEventListener from "@use-it/event-listener";
import {Dir, File, parseDuration, Row, S3Fetcher} from "./s3fetcher";
import {renderSize, SizeFmt} from "./size";
import {useQueryParam} from "use-query-params";
import {intParam, stringParam} from "./search-params"
import createPersistedState from "use-persisted-state";
import styled, {css} from "styled-components"
import * as rb from "react-bootstrap"
import {ThemeProvider} from "@mui/material"
import {Option} from "./radios";
import theme from "./theme";
import {DatetimeFmt, renderDatetime} from "./datetime";
import {ColumnHeader, HeaderSettings} from "./column-header";
import {stripPrefix} from "./utils";

const githubLogo = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFNTE3OEEyQTk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFNTE3OEEyQjk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU1MTc4QTI4OTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU1MTc4QTI5OTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+m4QGuQAAAyRJREFUeNrEl21ojWEYx895TDPbMNlBK46IUiNmPvHBSUjaqc0H8pF5+aDUKPEBqU2NhRQpX5Rv5jWlDIWlMCv7MMSWsWwmb3tpXub4XXWdPHvc9/Gc41nu+nedc7/8r/99PffLdYdDPsvkwsgkTBwsA/PADJCnzX2gHTwBt8Hl7p537/3whn04XoDZDcpBlk+9P8AFcAghzRkJwPF4zGGw0Y9QS0mAM2AnQj77FqCzrtcwB1Hk81SYojHK4DyGuQ6mhIIrBWB9Xm7ug/6B/nZrBHBegrkFxoVGpnwBMSLR9EcEcC4qb8pP14BWcBcUgewMnF3T34VqhWMFkThLJAalwnENOAKiHpJq1FZgI2AT6HZtuxZwR9GidSHtI30jOrbawxlVX78/AbNfhHlomEUJJI89O2MqeE79T8/nk8nMBm/dK576hZgmA3cp/R4l9/UeSxiHLVIlNm4nFfT0bxyuIj7LHRTKai+zdJobwMKzcZSJb0ePV5PKN+BqAAKE47UlMnERELMM3EdYP/yrd+XYb2mOiYBiQ8OQnoRBlXrl9JZix7D1pHTazu4MoyBcnYamqAjIMTR8G4FT8LuhLsexXYYjICBiqhQBvYb6fLZIJCjPypVvaOoVAW2WcasCnL2Nq82xHJNSqlCeFcDshaPK0twkAhosjZL31QYw+1rlMpWGMArl23SBsZZO58F2tlJXmjOXS+s4WGvpMiBJT/I2PInZ6lIs9/hBsNS1hS6BG0DSqmYEDRlCXQrmy50P1oDRKTSegmNbUsA0zDMwRhPJXeCE3vWLPQMvan6X8AgIa1vcR4AkGZkDR4ejJ1UHpsaVI0g2LInpOsNFUud1rhxSV+fzC9Woz2EZkWQuja7/B+jUrgtIMpy9YCW4n4K41YfzRneW5E1KJTe4B2Zq1Q5EHEtj4U3AfEzR5SVY4l7QYQPJdN2as7RKBF0BPZqqH4VgMAMBL8Byxr7y8zCZiDlnOcEKIPmUpgB5Z2ww5RdOiiRiNajUmWda5IG6WbhsyY2fx6m8gLcoJDJFkH219M3We1+cnda93pfycZpIJEL/s/wSYADmOAwAQgdpBAAAAABJRU5ErkJggg=="

const Container = styled(rb.Container)`
    margin-bottom: 2rem;
`
const RowStyle = css`
    padding 0 2rem;
`
const DivRow = styled(rb.Row)`
    ${RowStyle}
`
const HeaderRow = styled(DivRow)`
    /* margin-bottom: 1rem; */
`
const Breadcrumb = styled(rb.Breadcrumb)`
li+li:before {
    padding: 0.2em;
    color: black;
    content: "/";
}
`
const PaginationRow = styled(DivRow)`
    margin-top: 1rem;
    line-height: 1.2rem;
`
const Button = styled.button`
    font-size: 1em;
    margin-left: 1em;
    padding: 0 0.5em;
    border: 1px solid #bbb;
    cursor: pointer;
    box-sizing: border-box;
`
const PaginationButton = styled(Button)`
    margin-left: 0rem;
    margin-right: 0.5rem;
`
const FooterRow = styled(DivRow)`
    margin-top: 1rem;
`
const MetadataEl = styled.span`
    margin-top: .75rem;
    margin-left: 1rem;
`
const GithubLink = styled.a`
    margin-left: 1rem;
    margin-top: 0.4rem;
`

const FilesList = styled.table`
    tr {
        line-height: 1.6rem;
    }
    td,th {
        text-align: right;
        padding: 0 0.7rem;
    }
    td {
        font-family: monospace;
    }
`
const TotalRow = styled.tr`
    /*border-top: 1px solid grey;*/
    /*border-bottom: 1px solid grey;*/
    font-weight: bold;
    background-color: #f0f0f0;
`
const InlineBreadcrumbs = styled.span`
    span+span:before {
        padding: 0.2em;
        color: black;
        content: "/";
    }
    &:before {
        padding: 0.2em;
        color: black;
        content: "s3://";
    }
`
const InlineBreadcrumb = styled.span``
const textInputStyle = css`
    width: 2.6rem;
    text-align: right;
`
const GotoPage = styled.input`${textInputStyle}`
const Ttl = styled.input`${textInputStyle}`
const TtlControl = styled.span`
    margin-left: 0.5rem;
`

const PageNumber = styled.span`
    margin-left: 0.5rem;
    margin-right: 0.5rem;
`
const HotKey = styled.code`
    font-size: 1rem;
    margin: 0 0.3rem;
`
const RecurseControl = styled.span`
    margin-left: 0.5rem;
`
const Recurse = styled.input`
    margin-left: 0.3rem;
    vertical-align: middle;
`

const { ceil, floor, max, min } = Math

function DirRow(
    { Prefix: key }: Dir,
    { bucket, bucketUrlRoot, urlPrefix, duration, datetimeFmt, sizeFmt, }: {
        bucket: string,
        bucketUrlRoot: boolean,
        duration: Duration,
        datetimeFmt: DatetimeFmt,
        sizeFmt: SizeFmt
        urlPrefix?: string,
    },
) {
    const pieces = key.split('/')
    const name = pieces[pieces.length - 1]
    const fetcher = new S3Fetcher({ bucket, key, ttl: duration, })
    const totalSize = fetcher.cache?.totalSize
    const mtime = fetcher.cache?.LastModified
    const url = bucketUrlRoot ? `/${bucket}/${key}` : (urlPrefix ? `/${stripPrefix(urlPrefix.split('/'), key)}` :`/${key}`)
    return <tr key={key}>
        <td key="name">
            <Link to={url}>{name}</Link>
        </td>
        <td key="size">{totalSize ? renderSize(totalSize, sizeFmt) : ''}</td>
        <td key="mtime">{mtime ? renderDatetime(moment(mtime), datetimeFmt) : ''}</td>
    </tr>
}

function FileRow(
    { Key, LastModified, Size, }: File,
    { prefix, datetimeFmt, sizeFmt, }: { prefix: string[], datetimeFmt: DatetimeFmt, sizeFmt: SizeFmt, }) {
    return <tr key={Key}>
        <td key="name">{Key ? stripPrefix(prefix, Key) : ""}</td>
        <td key="size">{renderSize(Size, sizeFmt)}</td>
        <td key="mtime">{renderDatetime(moment(LastModified), datetimeFmt)}</td>
    </tr>
}

function TableRow(
    row: Row,
    extra: {
        bucket: string,
        bucketUrlRoot: boolean,
        duration: Duration,
        prefix: string[],
        urlPrefix?: string,
        datetimeFmt: DatetimeFmt,
        sizeFmt: SizeFmt,
    }
) {
    return (
        (row as Dir).Prefix !== undefined
            ? DirRow(row as Dir, extra)
            : FileRow(row as File, extra)
    )
}

const usePageIdx = createPersistedState('pageIdx')
const usePageSize = createPersistedState('pageSize')
const usePaginationInfoInURL = createPersistedState('paginationInfoInURL')
const useTtl = createPersistedState('ttl')
const useEagerMetadata = createPersistedState('eagerMetadata')
const useDatetimeFmt = createPersistedState('datetimeFmt')
const useSizeFmt = createPersistedState('sizeFmt')

const h10 = moment.duration(10, 'h')

function toPageIdxStr(idx: number) {
    return (idx >= 0 ? (idx + 1) : idx).toString()
}

export function S3Tree({ bucket = '', prefix }: { bucket: string, prefix?: string }) {
    const params = useParams()
    const navigate = useNavigate()

    const [ datetimeFmt, setDatetimeFmt ] = useDatetimeFmt<DatetimeFmt>('YYYY-MM-DD HH:mm:ss')
    const [ sizeFmt, setSizeFmt ] = useSizeFmt<SizeFmt>('iec')

    const path = (params['*'] || '').replace(/\/$/, '').replace(/^\//, '')
    const pathPieces = (prefix ? prefix.split('/') : []).concat(path ? path.split('/') : [])
    const keyPieces = bucket ? pathPieces : pathPieces.slice(1)
    const bucketUrlRoot = !bucket
    if (!bucket) {
        bucket = pathPieces[0]
        console.log(`Inferred bucket ${bucket} from URL path ${path}`)
    }
    const key = keyPieces.join('/')
    console.log(`Render ${bucket}/${key}: params`, params, ` (prefix ${prefix})`)

    const [ rows, setRows ] = useState<Row[] | null>(null)
    const [ s3PageSize, setS3PageSize ] = useState(1000)

    const [region, setRegion] = useState('us-east-1')  // TODO
    const [ ttl, setTtl ] = useTtl<string>('10h')
    const duration = parseDuration(ttl) || h10

    // Setting a new Nonce object is used to trigger `fetcher` to re-initialize itself from scratch after a
    // user-initiated cache purge
    const [ fetcherNonce, setFetcherNonce ] = useState({})
    const fetcher = useMemo(() => {
        console.log(`Memo: fetcher; bucket ${bucket} (key ${key}), current rows:`, rows)
        return new S3Fetcher({
            bucket,
            region,
            key,
            pageSize: s3PageSize,
            ttl: duration,
            cacheCb: cache => {
                console.log("CacheCb!", cache)
                setMetadataNonce({})
            }
        })
    }, [ bucket, region, key, fetcherNonce, ])

    // Current-directory metadata

    const [ metadataNonce, setMetadataNonce ] = useState({})
    const metadata = fetcher.checkMetadata()
    let { numChildren: numChildren, totalSize, LastModified, } =
        metadata
            ? metadata
            : { numChildren: undefined, totalSize: undefined, LastModified: undefined }
    // `numChildren` is sometimes known even if the others aren't (it only requires paging to the end of the bucket,
    // not computing child directories' sizes recursively)
    numChildren = numChildren === undefined ? fetcher?.cache?.numChildren : numChildren
    const timestamp = fetcher.cache?.timestamp
    console.log("Metadata:", metadata, "cache:", fetcher.cache)

    const [ paginationInfoInURL, setPaginationInfoInURL ] = usePaginationInfoInURL(true)
    const [ pageSize, setPageSize ] = paginationInfoInURL ?
        useQueryParam('s', intParam(20)) :
        usePageSize<number>(20)
    const numPages = numChildren === undefined ? undefined : ceil(numChildren / pageSize)

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
    console.log(`** Initializing, bucket ${bucket} key ${key}, page ${pageIdx}/${numPages} ⨉ ${pageSize}`)

    const cantPrv = pageIdx == 0
    const cantNxt = numPages === undefined || pageIdx + 1 == numPages

    // Key events

    const handler = useCallback(
        (e) => {
            if (e.key == 'u') {
                if (keyPieces.length) {
                    const newKey = keyPieces.slice(0, keyPieces.length - 1).join('/')
                    const url = bucketUrlRoot ? `/${bucket}/${newKey}` : (prefix ? `/${stripPrefix(prefix.split('/'), newKey)}` :`/${newKey}`)
                    console.log(`Navigating to ${url}`)
                    navigate(url)
                }
            } else if (e.key == '<') {
                if (!cantPrv) {
                    setPageIdxStr(toPageIdxStr(pageIdx - 1))
                }
            } else if (e.key == '>') {
                if (!cantNxt) {
                    setPageIdxStr(toPageIdxStr(pageIdx + 1))
                }
            }
        },
        [ bucket, key, params, pageIdx, numPages, ]
    );
    useEventListener("keypress", handler);

    const start = pageSize * pageIdx
    const end = start + pageSize

    useEffect(
        () => {
            console.log("Effect: rows")
            fetcher.get(start, end).then(setRows)
        },
        [ fetcher, pageIdx, pageSize, bucket, key, ]
    )

    const [ eagerMetadata, setEagerMetadata ] = useEagerMetadata(false)

    useEffect(
        () => {
            console.log(`Effect: compute metadata? (${eagerMetadata})`)
            if (eagerMetadata) {
                fetcher
                    .computeMetadata()
                    .then(() => setMetadataNonce({}))
            }
        },
        [ fetcher, bucket, key, eagerMetadata, ]
    )

    if (!rows) {
        return <div>Fetching {bucket}, page {pageIdx}…</div>
    }

    const ancestors =
        ([] as string[])
            .concat(keyPieces)
            .reduce<{ key: string, name: string }[]>(
                (prvs, nxt) => {
                    const parent = prvs[prvs.length - 1].key
                    return prvs.concat([{ key: parent ? `${parent}/${nxt}` : nxt, name: nxt }])
                },
                [ { key: '', name: bucket }, ],
            )

    console.log("Rows:", rows, `keyPieces:`, keyPieces, 'ancestors:', ancestors)

    function clearCache() {
        fetcher.clearCache()
        setFetcherNonce({})
    }

    const sizeHeaderSettings: HeaderSettings<SizeFmt> = {
        options: [
            { data: 'iec', label: 'Human Readable (IEC)', },
            { data: 'iso', label: 'Human Readable (ISO)', },
            { data: 'bytes', label: 'Bytes', },
        ],
        choice: sizeFmt,
        cb: setSizeFmt,
    }

    const datetimeOptions: Option<DatetimeFmt>[] = [
        { label: 'Relative', data: 'relative', },
        { label: 'YYYY-MM-DD HH:mm:ss', data: 'YYYY-MM-DD HH:mm:ss', },
        { label: 'YYYY-MM-DD', data: 'YYYY-MM-DD', }
    ]
    const datetimeHeaderSettings: HeaderSettings<DatetimeFmt> = {
        options: datetimeOptions,
        choice: datetimeFmt,
        cb: setDatetimeFmt,
    }

    return (
        <ThemeProvider theme={theme}>
        <Container>
            <HeaderRow>
                <Breadcrumb>
                    {
                        ancestors.map(({ key, name }) => {
                            const path = `${bucket}/${key}`
                            const url = bucketUrlRoot ? `/${bucket}/${key}` : (prefix ? `/${stripPrefix(prefix.split('/'), key)}` :`/${key}`)
                            return <li key={path}>
                                <Link to={url}>{name}</Link>
                            </li>
                        })
                    }
                </Breadcrumb>
                <MetadataEl>
                    <span className="metadatum">{numChildren === undefined ? '?' : numChildren} children,{' '}</span>
                    <span className="metadatum">fetched {timestamp ? renderDatetime(moment(timestamp), datetimeFmt) : '?'}</span>
                </MetadataEl>
                <GithubLink href="https://github.com/runsascoded/s3idx/issues">
                    <img src={`data:image/png;base64,${githubLogo}`}/>
                </GithubLink>
            </HeaderRow>
            <DivRow>
                <FilesList>
                    <thead>
                    <tr>
                        <th key="name">Name</th>
                        <th key="size">
                            {ColumnHeader('Size', sizeHeaderSettings)}
                        </th>
                        <th key="mtime">
                            {ColumnHeader('Modified', datetimeHeaderSettings)}
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    <TotalRow>
                        <td key="name"><InlineBreadcrumbs>
                            {
                                ancestors.map(({ key, name }) => {
                                    const path = `${bucket}/${key}`
                                    const url = bucketUrlRoot ? `/${bucket}/${key}` : (prefix ? `/${stripPrefix(prefix.split('/'), key)}` :`/${key}`)
                                    return <InlineBreadcrumb key={path}>
                                        <Link to={url}>{name}</Link>
                                    </InlineBreadcrumb>
                                })
                            }
                        </InlineBreadcrumbs></td>
                        <td key="size">{totalSize !== undefined ? renderSize(totalSize, sizeFmt) : '?'}</td>
                        <td key="mtime">{LastModified ? renderDatetime(moment(LastModified), datetimeFmt) : '?'}</td>
                    </TotalRow>
                    {
                        rows.map(row =>
                            TableRow(
                                row,
                                {
                                    bucket,
                                    prefix: keyPieces,
                                    bucketUrlRoot,
                                    urlPrefix: prefix,
                                    duration,
                                    datetimeFmt,
                                    sizeFmt,
                                }
                            )
                        )
                    }
                    </tbody>
                </FilesList>
            </DivRow>
            <PaginationRow>
                <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(0))} disabled={cantPrv}>{'<<'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(pageIdx - 1))} disabled={cantPrv}>{'<'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr(pageIdx + 1))} disabled={cantNxt}>{'>'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdxStr(toPageIdxStr((numPages || 0) - 1))} disabled={cantNxt}>{'>>'}</PaginationButton>{' '}
                <PageNumber>
                    Page{' '}
                    <GotoPage
                        type="number"
                        value={pageIdxStr}
                        onChange={e => setPageIdxStr(e.target.value || '')}
                    />{' '}
                    <span>of {numPages === null ? '?' : numPages}</span>{' ⨉ '}
                    <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                    >
                        {[10, 20, 50, 100].map(pageSize =>
                            <option key={pageSize} value={pageSize}>{pageSize}</option>
                        )}
                    </select>
                </PageNumber>
                {' '}
                <TtlControl>
                    TTL:{' '}
                    <Ttl
                        type="text"
                        defaultValue={ttl}
                        onChange={e => {
                            const ttl = e.target.value
                            const d = parseDuration(ttl)
                            if (d) {
                                setTtl(ttl)
                            }
                        }}
                    />
                </TtlControl>
            </PaginationRow>
            <FooterRow>
                <span className="hotkeys">
                    Hotkeys:
                    <HotKey>u</HotKey> (up),
                    <HotKey>&lt;</HotKey> (previous page),
                    <HotKey>&gt;</HotKey> (next page)
                </span>
                <Button onClick={() => clearCache()}>Clear cache</Button>
                <RecurseControl>
                    <label>
                        Recurse:
                        <Recurse
                            type="checkbox"
                            checked={eagerMetadata}
                            onChange={(e) => setEagerMetadata(e.target.checked)}
                        />
                    </label>
                </RecurseControl>
            </FooterRow>
        </Container>
        </ThemeProvider>
    )
}
