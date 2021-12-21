import React, {useCallback, useEffect, useMemo, useState,} from "react";
import moment from 'moment'
import {Link, Location, useLocation, useNavigate, useParams} from "react-router-dom";
import _ from "lodash";
import useEventListener from "@use-it/event-listener";
import {Dir, File, Row, S3Fetcher} from "./s3fetcher";
import {renderSize} from "./size";
import {useQueryParam} from "use-query-params";
import {intParam} from "./search-params"
import createPersistedState from "use-persisted-state";

const { ceil, floor, max, min } = Math

function rstrip(s: string, suffix: string): string {
    if (s.substring(s.length - suffix.length, s.length) == suffix) {
        return rstrip(s.substring(0, s.length - suffix.length), suffix)
    } else {
        return s
    }
}

function stripPrefix(prefix: string[], k: string) {
    const pcs = k.split('/')
    if (!_.isEqual(prefix, pcs.slice(0, prefix.length))) {
        throw new Error(`Key ${k} doesn't start with prefix ${prefix.join("/")}`)
    }
    return pcs.slice(prefix.length).join('/')
}

function DirRow({ Prefix }: Dir, { bucket, location }: { bucket: string, location: Location }) {
    const prefix = Prefix ? rstrip(Prefix, '/') : ''
    const pieces = prefix.split('/')
    const name = pieces[pieces.length - 1]
    const fetcher = new S3Fetcher({bucket, key: prefix})
    const totalSize = fetcher.cache?.totalSize
    const mtime = fetcher.cache?.LastModified
    return <tr key={Prefix}>
        <td key="name">
            <Link to={`/s3/${bucket}/${prefix}`}>{name}</Link>
        </td>
        <td key="size">{totalSize ? renderSize(totalSize, 'iec') : ''}</td>
        <td key="mtime">{mtime ? moment(mtime).format('YYYY-MM-DD') : ''}</td>
    </tr>
}

function FileRow({ Key, LastModified, Size, }: File, { prefix }: { prefix: string[] }) {
    return <tr key={Key}>
        <td key="name">{Key ? stripPrefix(prefix, Key) : ""}</td>
        <td key="size">{renderSize(Size, 'iec')}</td>
        <td key="mtime">{moment(LastModified).format('YYYY-MM-DD')}</td>
    </tr>
}

function TableRow(row: Row, extra: { bucket: string, location: Location, prefix: string[], }) {
    return (
        (row as Dir).Prefix !== undefined
            ? DirRow(row as Dir, extra)
            : FileRow(row as File, extra)
    )
}

const usePageSize = createPersistedState('pageSize')

export function S3Tree({}) {
    const params = useParams()
    console.log(params)
    const location = useLocation()
    const navigate = useNavigate()

    const path = (params['*'] || '').replace(/\/$/, '')
    const [ bucket, ...keyPieces ] = path.split('/')
    const key = keyPieces.join('/')

    const [ pageIdx, setPageIdx ] = useState(0)

    useEffect(() => {
        console.log("Reset pageIdx")
        setPageIdx(0)
        setTotal(null)
    }, [ path, ] )

    //const [ pageSize, setPageSize ] = useQueryParam('p', intParam(20))
    const [ pageSize, setPageSize ] = usePageSize<number>(20)

    const [ rows, setRows ] = useState<Row[] | null>(null)
    const mismatchedRows = (rows || []).filter(
        row => {
            const Prefix = (row as Dir).Prefix
            const Key = Prefix ? Prefix : (row as File).Key
            return Key.substring(0, key.length) != key
        }
    )
    if (mismatchedRows.length) {
        console.warn(`${mismatchedRows.length} rows don't match bucket/key ${bucket}/${key}:`, mismatchedRows)
        setRows(null)
        setPageIdx(0)
        return <div>hmm…</div>  // TODO
    }
    const [ s3PageSize, setS3PageSize ] = useState(1000)
    const [ total, setTotal ] = useState<number | null>(null)
    const numPages = useMemo(
        () => total === null ? null : ceil(total / pageSize),
    [ total, pageIdx, pageSize, ]
    )

    const cantPrv = pageIdx == 0
    const cantNxt = numPages === null || pageIdx + 1 == numPages

    const handler = useCallback(
        (e) => {
            console.log(e, cantPrv, cantNxt)
            if (e.key == 'u') {
                if (keyPieces.length) {
                    const newKey = keyPieces.slice(0, keyPieces.length - 1).join('/')
                    const url = `/s3/${bucket}/${newKey}`
                    console.log(`Navigating to ${url}`)
                    navigate(url)
                }
            } else if (e.key == '<') {
                if (!cantPrv) {
                    setPageIdx(pageIdx - 1)
                }
            } else if (e.key == '>') {
                if (!cantNxt) {
                    setPageIdx(pageIdx + 1)
                }
            }
        },
        [params, pageIdx, numPages, ]
    );
    useEventListener("keypress", handler);

    console.log(`Initializing, bucket ${bucket} key ${key}, page idx ${pageIdx} size ${pageSize} num ${numPages} total ${total}, location.state ${location.state}`)
    const [region, setRegion] = useState('us-east-1')
    const fetcher = useMemo(() => {
        console.log(`new fetcher for bucket ${bucket} (key ${key}), current rows:`, rows)
        return new S3Fetcher({ bucket, region, key, pageSize: s3PageSize, endCb: setTotal })
    }, [ bucket, region, key ])

    if (total === null && fetcher.cache?.end !== undefined) {
        setTotal(fetcher.cache?.end)
    }

    const start = pageSize * pageIdx
    const end = start + pageSize

    const [ totalSize, setTotalSize ] = useState<number | null>(null)

    useEffect(
        () => {
            fetcher.get(start, end).then(setRows)
        },
        [ fetcher, pageIdx, pageSize, bucket, key, ]
    )

    useEffect(
        () => { fetcher.computeMetadata().then(( { totalSize }) => setTotalSize(totalSize)) },
        [ fetcher, bucket, key, ]
    )

    if (!rows) {
        return <div>Fetching {bucket}, page {pageIdx}…</div>
    }

    console.log("Rows:", rows)

    const ancestors =
        ([] as string[])
            .concat(keyPieces)
            .reduce<{ path: string, name: string }[]>(
                (prvs, nxt) => {
                    const parent = prvs[prvs.length - 1].path
                    return prvs.concat([{ path: `${parent}/${nxt}`, name: nxt }])
                },
                [ { path: bucket, name: bucket }, ],
            )

    const cache = fetcher.cache
    const numChildren = cache?.end
    const mtime = cache?.LastModified

    return (
        <div className="container">
            <div className="header row">
                <ul className="breadcrumb">
                    {
                        ancestors.map(({ path, name }) => {
                            return <li key={path}>
                                <Link to={`/s3/${path}`}>{name}</Link>
                            </li>
                        })
                    }
                </ul>
                <span className="metadata">
                    <span className="metadatum">{numChildren} children,&nbsp;</span>
                    <span className="metadatum">total size {totalSize ? renderSize(totalSize, 'iec') : ''} ({totalSize}),&nbsp;</span>
                    <span className="metadatum">last modified {moment(mtime).format('YYYY-MM-DD')}</span>
                </span>
                <button className="clear-cache" onClick={() => fetcher.clearCache()}>Clear cache</button>
            </div>
            <div className="row">
                <table className="files-list">
                    <thead>
                    <tr>
                        <th key="name">Name</th>
                        <th key="size">Size</th>
                        <th key="mtime">Modified</th>
                    </tr>
                    </thead>
                    <tbody>{
                        rows.map(row =>
                            TableRow(row, { bucket, location, prefix: keyPieces, })
                        )
                    }
                    </tbody>
                </table>
            </div>
            <div className="row pagination">
                <button onClick={() => setPageIdx(0)} disabled={cantPrv}>{'<<'}</button>{' '}
                <button onClick={() => setPageIdx(pageIdx - 1)} disabled={cantPrv}>{'<'}</button>{' '}
                <button onClick={() => setPageIdx(pageIdx + 1)} disabled={cantNxt}>{'>'}</button>{' '}
                <button onClick={() => setPageIdx((numPages || 0) - 1)} disabled={cantNxt}>{'>>'}</button>{' '}
                <span className="page-number">
                    Page{' '}
                    <span>{pageIdx + 1} of {numPages === null ? '?' : numPages}</span>{' '}
                </span>
                <span className="goto-page">| Go to page:{' '}</span>
                <input
                    type="number"
                    defaultValue={pageIdx + 1}
                    onChange={e => setPageIdx(e.target.value ? Number(e.target.value) - 1 : 0)}
                    style={{ width: '100px' }}
                />
                {' '}
                <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                >
                    {[10, 20, 50, 100].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                            Show {pageSize}
                        </option>
                    ))}
                </select>
            </div>
            <div className="row hotkeys">
                Hotkeys: <code className="key">u</code> (up), <code className="key">&lt;</code> (previous page), <code className="key">&gt;</code> (next page)
            </div>
        </div>
    )
}
