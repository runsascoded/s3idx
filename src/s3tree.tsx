import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";
import moment, {Duration} from 'moment'
import {Link, useNavigate, useParams} from "react-router-dom";
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
import {GithubIssuesLink} from "./github-link";
import {CredentialsOptions} from "aws-sdk/lib/credentials";

const Container = styled(rb.Container)`
    margin-bottom: 2rem;
    code {
        font-size: 1em;
        margin: 0 0.3rem;
    }
    h3 {
        font-size: 1.4rem;
    }
    h4 {
        font-size: 1.2rem;
    }
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
const CodeBlock = styled.pre`
    margin-left: 2em;
    background: #f8f8f8;
    padding: 0.6em 1.1em;
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
const GotoPage = styled.input`
    width: 2.6rem;
    text-align: right;
`
const Ttl = styled.input`
    width: 2.9rem;
    text-align: right;
    padding-right: 0.3rem;
`
const TtlControl = styled.span`
    margin-left: 0.5rem;
`

const PageNumber = styled.span`
    margin-left: 0.5rem;
    margin-right: 0.5rem;
`
const Credentials = styled.div`
    td:first-child {
        padding-right: 0.4em;
        text-align: right;
    }
    input.credential {
        padding: 0 0.4em;
        width: 20em;
    }
    tr {
        line-height: 1.2em;
        /*margin-bottom: 0.2em;*/
    }
`
const HotKey = styled.code``
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
    { bucket, bucketUrlRoot, urlPrefix, duration, datetimeFmt, sizeFmt, credentials, }: {
        bucket: string,
        bucketUrlRoot: boolean,
        duration: Duration,
        datetimeFmt: DatetimeFmt,
        sizeFmt: SizeFmt,
        credentials?: CredentialsOptions,
        urlPrefix?: string,
    },
) {
    const pieces = key.split('/')
    const name = pieces[pieces.length - 1]
    const fetcher = new S3Fetcher({
        bucket, key,
        ttl: duration,
        credentials,
    })
    const totalSize = fetcher.cache?.totalSize
    const mtime = fetcher.cache?.LastModified
    const url = bucketUrlRoot ? `/${bucket}/${key}` : (urlPrefix ? `/${stripPrefix(urlPrefix.split('/'), key)}` :`/${key}`)
    return <tr key={key}>
        <td key="name">
            <Link to={url}>{name}</Link>
        </td>
        <td key="size">{totalSize ? renderSize(totalSize, sizeFmt) : ''}</td>
        <td key="mtime">{mtime ? renderDatetime(mtime, datetimeFmt) : ''}</td>
    </tr>
}

function FileRow(
    { Key, LastModified, Size, }: File,
    { prefix, datetimeFmt, sizeFmt, }: { prefix: string[], datetimeFmt: DatetimeFmt, sizeFmt: SizeFmt, }) {
    return <tr key={Key}>
        <td key="name">{Key ? stripPrefix(prefix, Key) : ""}</td>
        <td key="size">{renderSize(Size, sizeFmt)}</td>
        <td key="mtime">{renderDatetime(LastModified, datetimeFmt)}</td>
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
        credentials?: CredentialsOptions,
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
const useRegion = createPersistedState('region')
const useAccessKeyId = createPersistedState('accessKeyId')
const useSecretAccessKey = createPersistedState('secretAccessKey')

const h10 = moment.duration(10, 'h')

function toPageIdxStr(idx: number) {
    return (idx >= 0 ? (idx + 1) : idx).toString()
}

type S3IdxConfig = {
    datetimeFmt: DatetimeFmt
    sizeFmt: SizeFmt
    eagerMetadata: boolean
    ttl: string
    pageSize: number,
    s3PageSize: number,
    paginationInfoInURL: boolean,
    region?: string,
}

const DefaultConfigs: S3IdxConfig = {
    datetimeFmt: "YYYY-MM-DD HH:mm:ss",
    sizeFmt: 'iso',
    eagerMetadata: false,
    ttl: '10h',
    pageSize: 20,
    s3PageSize: 1000,
    paginationInfoInURL: true,
}

export function S3Tree({ bucket = '', prefix }: { bucket: string, prefix?: string }) {
    const globalConfig = useRef((window as any).S3IDX_CONFIG)
    const config: S3IdxConfig = { ...DefaultConfigs, ...globalConfig.current }

    // Credentials

    const [ accessKeyId, setAccessKeyId ] = useAccessKeyId<string | null>(null)
    const [ secretAccessKey, setSecretAccessKey ] = useSecretAccessKey<string | null>(null)
    const credentials =
        accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined

    // CORS error handling

    const [ needsCors, setNeedsCors ] = useState(false)
    const [ needsAuth, setNeedsAuth ] = useState(false)

    const handleRequestError = (err: any) => {
        console.log("Error!", err)
        if (err.code === 'NetworkingError') {
            console.warn(`Handling CORS error (${err.statusCode})`)
            setNeedsCors(true)
        } else if (err.statusCode == 403 || err.code == 'AccessDenied') {
            console.warn('Handling auth error')
            setNeedsAuth(true)
        } else {
            // debugger
            console.error(`Other error (${err.statusCode}):`, err)
        }
    }

    const params = useParams()
    const navigate = useNavigate()

    const [ datetimeFmt, setDatetimeFmt ] = useDatetimeFmt<DatetimeFmt>(config.datetimeFmt)
    const [ sizeFmt, setSizeFmt ] = useSizeFmt<SizeFmt>(config.sizeFmt)

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
    const [ s3PageSize, setS3PageSize ] = useState(config.s3PageSize)

    const [region, setRegion] = useRegion(config.region)
    const [ ttl, setTtl ] = useTtl<string>(config.ttl)
    const duration = parseDuration(ttl) || h10

    const [ metadataNonce, setMetadataNonce ] = useState({})

    // Setting a new Nonce object is used to trigger `fetcher` to re-initialize itself from scratch after a
    // user-initiated cache purge
    const [ fetcherNonce, setFetcherNonce ] = useState({})
    const fetcher = useMemo(() => {
        console.log(`Memo: fetcher; bucket ${bucket} (key ${key}), current rows:`, rows, `credentials? (${region}, ${!!credentials})`)
        return new S3Fetcher({
            bucket,
            region,
            key,
            pageSize: s3PageSize,
            ttl: duration,
            credentials,
            cacheCb: cache => {
                console.log("CacheCb!", cache)
                setMetadataNonce({})
            }
        })
    }, [ fetcherNonce, bucket, key, region, accessKeyId, secretAccessKey, ])

    // Current-directory metadata

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

    const [ paginationInfoInURL, setPaginationInfoInURL ] = usePaginationInfoInURL(config.paginationInfoInURL)
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
            if (needsCors || needsAuth) return
            console.log("Effect: rows")
            fetcher
                .get(start, end)
                .then(setRows, handleRequestError)
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

    const inputRegion = useRef<HTMLInputElement | null>(null)
    const inputAccessKey = useRef<HTMLInputElement | null>(null)
    const inputSecretKey = useRef<HTMLInputElement | null>(null)

    const credentialsEl = (
        <Credentials>
            <table>
                <tbody>
                <tr>
                    <td>Region:</td>
                    <td>
                        <input
                            className="credential"
                            type="text"
                            placeholder="Region"
                            defaultValue={region}
                            ref={inputRegion}
                        />
                    </td>
                </tr>
                <tr>
                    <td>Access key:</td>
                    <td>
                        <input
                            className="credential"
                            type="text"
                            placeholder="Access key"
                            defaultValue={accessKeyId || ''}
                            ref={inputAccessKey}
                        />
                    </td>
                </tr>
                <tr>
                    <td>Secret key:</td>
                    <td>
                        <input
                            className="credential"
                            type="password"
                            placeholder="Secret key"
                            defaultValue=""
                            ref={inputSecretKey}
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <input type="button" value="Update" onClick={() => {
                            const region = inputRegion.current?.value
                            const accessKey = inputAccessKey.current?.value
                            const secretKey = inputSecretKey.current?.value
                            console.log("Credentials:", region , accessKey, secretKey ? '*'.repeat(secretKey.length) : undefined)
                            setRegion(region)
                            if (accessKey && secretKey) {
                                setAccessKeyId(accessKey)
                                setSecretAccessKey(secretKey)
                                setNeedsAuth(false)
                            } else if (accessKey || secretKey) {
                                console.error('Set both access key and secret key, or neither')
                            }
                        }} />
                    </td>
                    <td></td>
                </tr>
                </tbody>
            </table>
        </Credentials>
    )

    if (!rows) {
        // TODO: possibly add region to URL (mirror `window.location`)?
        const s3Url = `https://${bucket}.s3.amazonaws.com/index.html`
        if (needsAuth) {
            return (
                <Container>
                    <h3>Authentication error</h3>
                    {credentialsEl}
                </Container>
            )
        } else if (needsCors) {
            return (
                <Container>
                    <h3>Network error (CORS?)</h3>
                    {credentialsEl}
                    <p>Bucket <code>{bucket}</code> may need CORS enabled.</p>
                    <p>Mitigate by enabling CORS, or installing <code>index.html</code> directly on the bucket:</p>
                    <h4>Enable CORS on bucket</h4>
                    <p>Bash commands for enabling:</p>
                    <CodeBlock>{`cat >cors.json <<EOF
{
    "CORSRules": [{
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["Accept-Ranges", "Content-Encoding"]
    }]
}
EOF
aws s3api put-bucket-cors --bucket "${bucket}" --cors-configuration "$(cat cors.json)"
`}
                    </CodeBlock>
                    <h4>Install <code>index.html</code> in bucket</h4>
                    <p>You can also install this <code>index.html</code> in the bucket <code>{bucket}</code>, and visit it directly:</p>
                    <CodeBlock>{`aws s3 cp s3://s3idx/index.html s3://${bucket}/index.html --content-type="text/html; charset=utf-8" --acl public-read`}</CodeBlock>
                    <p>then visit <a href={s3Url}>{s3Url}</a></p>
                </Container>
            )
        } else {
            return (
                <Container>
                    <HeaderRow>
                        Fetching {bucket}, page {pageIdx}…
                    </HeaderRow>
                </Container>
            )
        }
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
        setEagerMetadata(false)
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
                    <span className="metadatum">fetched {timestamp ? renderDatetime(timestamp, datetimeFmt) : '?'}</span>
                </MetadataEl>
                <GithubIssuesLink />
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
                        <td key="mtime">{
                            LastModified
                                ? renderDatetime(LastModified, datetimeFmt)
                                : (LastModified === null ? '∅' : '?')
                        }</td>
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
                                    credentials,
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
