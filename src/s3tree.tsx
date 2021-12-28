import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";
import moment from 'moment'
import {Link, useNavigate, useParams} from "react-router-dom";
import useEventListener from "@use-it/event-listener";
import {Fetcher, parseDuration, Row} from "./s3/fetcher";
import {SizeFmt} from "./size";
import createPersistedState from "use-persisted-state";
import styled from "styled-components"
import {Breadcrumb as BootstrapBreadcrumb, Container as BootstrapContainer,} from "react-bootstrap";
import {ThemeProvider} from "@mui/material"
import theme from "./theme";
import {DatetimeFmt} from "./datetime";
import {stripPrefix} from "./utils";
import {GithubIssuesLink, issuesUrl} from "./github-link";
import {CredentialsOptions} from "aws-sdk/lib/credentials";
import {makeTooltip} from "./tooltip";
import {FilesList,} from './files-list';
import {makePagination, PaginationRow, toPageIdxStr} from "./pagination";
import {Button, CodeBlock, DivRow, SettingsLabel} from "./style";
import {AuthSettings, default as CredentialsFC} from "./credentials";
import {useQueryParam} from "use-query-params";
import {boolParam} from "./search-params";
import {S3LocationInfo, useS3Location} from "./s3/location";

// Container / Row styles

const Container = styled(BootstrapContainer)`
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

// Top / Metadata row

const HeaderRow = styled(DivRow)`
    /* margin-bottom: 1rem; */
`
const Breadcrumbs = styled(BootstrapBreadcrumb)`
li+li:before {
    padding: 0.2em;
    color: black;
    content: "/";
}
`

// Cache/TTL row

const CacheRow = styled(DivRow)`
    margin-top: 1rem;
`
const CacheContainer = styled.div`
    margin-top: auto;
    margin-bottom: auto;
`
const Ttl = styled.input`
    width: 2.4em;
    text-align: right;
    padding: 0.2em;
    border: 0;
`
const TtlControl = styled.span`
    label {
        font-weight: bold;
    }
`
const CacheButton = styled(Button)`
    margin-left: 0.3em;
    font-size: 1em;
    max-height: 2em;
    margin-top: auto;
    margin-bottom: auto;
`
const RefreshCacheButton = styled(CacheButton)`
    padding: 0.2em 0.3em;
    .refresh-cache-label {
        font-size: 1.3em;
        line-height: 1em;
        vertical-align: middle;
    }
`
const RecurseButton = styled(CacheButton)`
    padding: 0.2em 0.4em;
`

// GitHub/Auth/Hotkeys row

const FooterRow = styled(DivRow)``
const Hotkeys = styled.div`
    display: inline-block;
    padding: 0.5em;
    .hotkeys-header {
        font-weight: bold;
    }
    .hotkeys-table td:first-child {
        padding-right: 0.5em;
    }
`
const HotKey = styled.code`
    font-size: 1.2em;
`
const HotkeysLabel = styled.span`
    ${SettingsLabel}
    font-size: 2.7em;
`
const GithubLabel = styled.span`
    ${SettingsLabel}
    font-size: 1em;
`

const useEagerMetadata = createPersistedState('eagerMetadata')
const useDatetimeFmt = createPersistedState('datetimeFmt')
const useFetchedFmt = createPersistedState('fetchedFmt')
const useSizeFmt = createPersistedState('sizeFmt')

const h10 = moment.duration(10, 'h')

type S3IdxConfig = {
    datetimeFmt: DatetimeFmt
    fetchedFmt: DatetimeFmt
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
    fetchedFmt: 'relative',
    sizeFmt: 'iec',
    eagerMetadata: false,
    ttl: '10h',
    pageSize: 20,
    s3PageSize: 1000,
    paginationInfoInURL: true,
}

export function S3Tree(
    { s3LocationInfo }: {
        s3LocationInfo: S3LocationInfo
    }
) {
    // let s3BucketEndpoint = true  // TODO: remove
    const globalConfig = useRef((window as any).S3IDX_CONFIG)
    const config: S3IdxConfig = { ...DefaultConfigs, ...globalConfig.current }

    // CORS/Auth error handling

    const [ needsCors, setNeedsCors ] = useState(false)
    const [ needsAuth, setNeedsAuth ] = useQueryParam('auth', boolParam())

    const handleRequestError = (err: any) => {
        console.log("Error!", err)
        if (err.code === 'NetworkingError') {
            console.warn(`Handling CORS error (statusCode: ${err.statusCode})`)
            setNeedsCors(true)
        } else if (err.statusCode == 403 || err.code == 'AccessDenied') {
            console.warn('Handling auth error')
            setNeedsAuth(true)
        } else {
            // debugger
            console.error(`Other error (${err.statusCode}):`, err)
        }
    }

    const {
        bucket,
        endpoint,
        key,
        keyPieces,
        bucketUrlRoot,
        useBucketState,
    } = useS3Location(s3LocationInfo)

    const params = useParams()
    const navigate = useNavigate()

    const [ datetimeFmt, setDatetimeFmt ] = useDatetimeFmt<DatetimeFmt>(config.datetimeFmt)
    const [ fetchedFmt, setFetchedFmt ] = useFetchedFmt<DatetimeFmt>(config.fetchedFmt)
    const [ sizeFmt, setSizeFmt ] = useSizeFmt<SizeFmt>(config.sizeFmt)

    const [ rows, setRows ] = useState<Row[] | null>(null)
    const [ s3PageSize, ] = useState(config.s3PageSize)  // TODO

    // Credentials

    const [ region, setRegion, ] = useBucketState('region', config.region)
    const [ accessKeyId, setAccessKeyId ] = useBucketState<string | null>('accessKeyId', null)
    const [ secretAccessKey, setSecretAccessKey ] = useBucketState<string | null>('secretAccessKey', null)
    const credentials: CredentialsOptions | undefined =
        accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined

    const { isS3Domain, urlMetadata, urlPathPrefix, } = s3LocationInfo

    if (isS3Domain && !urlMetadata.bucket) {
        // On non-bucket-specific s3.amazonaws.com subdomains, ensure no authentication info is stored
        if (accessKeyId) setAccessKeyId(null)
        if (secretAccessKey) setSecretAccessKey(null)
    }

    const [ ttl, setTtl ] = useBucketState('ttl', config.ttl)
    const duration = parseDuration(ttl) || h10

    const [ metadataNonce, setMetadataNonce ] = useState({})

    // Setting a new Nonce object is used to trigger `fetcher` to re-initialize itself from scratch after a
    // user-initiated cache purge
    const [ fetcherNonce, setFetcherNonce ] = useState({})
    const fetcher = useMemo(() => {
        console.log(`Memo: fetcher; bucket ${bucket} (key ${key}), current rows:`, rows, `credentials? (${region}, ${!!credentials}), endpoint ${endpoint}`)
        return new Fetcher({
            bucket,
            region,
            key,
            pageSize: s3PageSize,
            ttl: duration,
            credentials,
            endpoint,
            cacheCb: cache => {
                console.log("CacheCb!", cache)
                setMetadataNonce({})
            }
        })
    }, [ fetcherNonce, bucket, key, region, accessKeyId, secretAccessKey, endpoint, ])

    // Current-directory metadata

    const metadata = useMemo(() => fetcher.checkMetadata(), [ fetcher, metadataNonce, ])
    let { numChildren: numChildren, totalSize, LastModified, } =
        metadata
            ? metadata
            : { numChildren: undefined, totalSize: undefined, LastModified: undefined }
    // `numChildren` is sometimes known even if the others aren't (it only requires paging to the end of the bucket,
    // not computing child directories' sizes recursively)
    numChildren = numChildren === undefined ? fetcher?.cache?.numChildren : numChildren
    const timestamp = fetcher.cache?.timestamp
    // console.log("Metadata:", metadata, "cache:", fetcher.cache)

    const paginationState = makePagination({ numChildren, config, })
    const {
        pageIdx,
        setPageIdxStr,
        pageSize,
        numPages,
        cantPrv, cantNxt,
    } = paginationState

    // Key events

    const keypressHandler = useCallback(
        (e) => {
            if (e.key == 'u') {
                if (keyPieces.length) {
                    const newKey = keyPieces.slice(0, keyPieces.length - 1).join('/')
                    const url = bucketUrlRoot ? `/${bucket}/${newKey}` : (urlPathPrefix ? `/${stripPrefix(urlPathPrefix.split('/'), newKey)}` :`/${newKey}`)
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
    useEventListener("keypress", keypressHandler);

    const start = pageSize * pageIdx
    const maxEnd = start + pageSize

    // Effect: fetch rows
    useEffect(
        () => {
            if (needsCors || needsAuth) return
            console.log("Effect: rows")
            fetcher
                .get(start, maxEnd)
                .then(setRows, handleRequestError)
        },
        [ fetcher, pageIdx, pageSize, bucket, key, ]
    )

    const [ eagerMetadata, setEagerMetadata ] = useEagerMetadata(false)

    // Effect: (maybe) compute metadata
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

    function Credentials(): JSX.Element {
        return <CredentialsFC {...{
            region, setRegion,
            urlMetadata,
            isS3Domain,
            accessKeyId, setAccessKeyId,
            secretAccessKey, setSecretAccessKey,
            setNeedsAuth,
        }} />
    }

    const Tooltip = makeTooltip()

    const s3Url = `${endpoint}/index.html`
    if (needsAuth) {
        return (
            <Container>
                <h2>Authentication error</h2>
                {Credentials()}
            </Container>
        )
    } else if (needsCors) {
        return (
            <Container>
                <h2>Network error</h2>
                <p>Seems like a CORS problem (check the Developer Tools for more details). You may need to either:</p>
                <ul>
                    <li>enable CORS on the bucket (see below), or</li>
                    <li>specify the bucket's region, or an access/secret key pair</li>
                </ul>
                <p>If the info below doesn't help, feel free to <a href={issuesUrl}>file an issue</a> with info about
                    what you're seeing (output from JavaScript Console will be useful to include).</p>
                <h3 id={"credentials"}>Authentication</h3>
                {Credentials()}
                <h3 id={"CORS"}>Enable CORS on bucket</h3>
                <p>Bash commands for enabling:</p>
                <CodeBlock>{`cat >cors.json <<EOF
{
    "CORSRules": [{
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["${window.location.host}"],
        "ExposeHeaders": ["Accept-Ranges", "Content-Encoding"]
    }]
}
EOF
aws s3api put-bucket-cors --bucket "${bucket}" --cors-configuration "$(cat cors.json)"
`}
                </CodeBlock>
                {
                    isS3Domain ? null : <>
                        <h4>Install <code>index.html</code> in bucket</h4>
                        <p>You can also install this <code>index.html</code> in the bucket <code>{bucket}</code>, and visit it directly:</p>
                        <CodeBlock>{`aws s3 cp s3://s3idx/index.html s3://${bucket}/index.html --content-type="text/html; charset=utf-8" --acl public-read`}</CodeBlock>
                        <p>then visit <a href={s3Url}>{s3Url}</a></p>
                    </>
                }
            </Container>
        )
    }

    if (!rows) {
        return (
            <Container>
                <HeaderRow>
                    Fetching {bucket}, page {pageIdx}…
                </HeaderRow>
            </Container>
        )
    }

    const end = start + rows.length

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

    return (
        <ThemeProvider theme={theme}>
        <Container>
            <HeaderRow>
                <Breadcrumbs>
                    {
                        ancestors.map(({ key, name }) => {
                            const path = `${bucket}/${key}`
                            const url = bucketUrlRoot ? `/${bucket}/${key}` : (urlPathPrefix ? `/${stripPrefix(urlPathPrefix.split('/'), key)}` :`/${key}`)
                            return <li key={path}>
                                <Link to={url}>{name}</Link>
                            </li>
                        })
                    }
                </Breadcrumbs>
            </HeaderRow>
            <DivRow>
                <FilesList {...{
                    rows,
                    bucket, keyPieces,
                    bucketUrlRoot, urlPathPrefix,
                    ancestors,
                    sizeFmt, setSizeFmt,
                    datetimeFmt, setDatetimeFmt,
                    Tooltip,
                    totalSize, LastModified, timestamp,
                    duration,
                    fetchedFmt,
                    credentials,
                    endpoint,
                }} />
            </DivRow>
            <PaginationRow {...{ state: paginationState, start, end, }}/>
            <CacheRow>
                <CacheContainer>
                    <Tooltip id={"cache-ttl"} center placement={"bottom"} title={"Length of time to keep cached S3 info before purging/refreshing"}>
                        <TtlControl>
                            <label>Cache:</label>{' '}
                            TTL:
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
                    </Tooltip>
                    <Tooltip id={"refresh-cache"} placement={"bottom"} title={
                        "Clear/Refresh cache"
                    }>
                        <RefreshCacheButton onClick={() => clearCache()}>
                            <span className={"refresh-cache-label"}>♻</span>
                        ️</RefreshCacheButton>
                    </Tooltip>
                    <Tooltip id={"recurse"} clickToPin={false} center placement={"bottom"} title={
                        "Recursively fetch subdirectories, compute total sizes / mtimes"
                    }>
                        <RecurseButton disabled={eagerMetadata}>
                            <span onClick={() => setEagerMetadata(!eagerMetadata)}>
                                Recurse
                            </span>
                        </RecurseButton>
                    </Tooltip>
                </CacheContainer>
            </CacheRow>
            <FooterRow>
                <Tooltip id={"github-header"} center clickToPin={false} arrow placement="bottom" title="See this project's open issues on GitHub">
                    <GithubLabel>
                        <GithubIssuesLink />
                    </GithubLabel>
                </Tooltip>
                <AuthSettings {...{ Credentials, Tooltip, }} />
                <Tooltip id={"hotkeys"} placement={"right"} title={
                    <Hotkeys>
                        <div className={"hotkeys-header"}>Hotkeys:</div>
                        <table className={"hotkeys-table"}>
                            <tbody>
                            <tr><td><HotKey>u</HotKey></td><td>up (parent folder)</td></tr>
                            <tr><td><HotKey>&lt;</HotKey></td><td>previous page</td></tr>
                            <tr><td><HotKey>&gt;</HotKey></td><td>next page</td></tr>
                            </tbody>
                        </table>
                    </Hotkeys>
                }>
                    <HotkeysLabel>⌨</HotkeysLabel>
                </Tooltip>
            </FooterRow>
        </Container>
        </ThemeProvider>
    )
}
