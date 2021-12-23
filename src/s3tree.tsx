import React, {useCallback, useEffect, useMemo, useState,} from "react";
import moment, {Moment} from 'moment'
import {Link, useNavigate, useParams} from "react-router-dom";
import _ from "lodash";
import useEventListener from "@use-it/event-listener";
import {Dir, File, Row, S3Fetcher} from "./s3fetcher";
import {renderSize} from "./size";
import {useQueryParam} from "use-query-params";
import {intParam} from "./search-params"
import createPersistedState from "use-persisted-state";

const { ceil, floor, max, min } = Math

function stripPrefix(prefix: string[], k: string) {
    const pcs = k.split('/')
    if (!_.isEqual(prefix, pcs.slice(0, prefix.length))) {
        return k
        // throw new Error(`Key ${k} doesn't start with prefix ${prefix.join("/")}`)
    }
    return pcs.slice(prefix.length).join('/')
}

function DirRow(
    { Prefix: key }: Dir,
    { bucket, bucketUrlRoot, urlPrefix }: {
        bucket: string,
        bucketUrlRoot: boolean,
        urlPrefix?: string,
    },
) {
    const pieces = key.split('/')
    const name = pieces[pieces.length - 1]
    const fetcher = new S3Fetcher({bucket, key})
    const totalSize = fetcher.cache?.totalSize
    const mtime = fetcher.cache?.LastModified
    const url = bucketUrlRoot ? `/${bucket}/${key}` : (urlPrefix ? `/${stripPrefix(urlPrefix.split('/'), key)}` :`/${key}`)
    return <tr key={key}>
        <td key="name">
            <Link to={url}>{name}</Link>
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

function TableRow(row: Row, extra: { bucket: string, bucketUrlRoot: boolean, prefix: string[], urlPrefix?: string, }) {
    return (
        (row as Dir).Prefix !== undefined
            ? DirRow(row as Dir, extra)
            : FileRow(row as File, extra)
    )
}

const usePageIdx = createPersistedState('pageIdx')
const usePageSize = createPersistedState('pageSize')
const usePaginationInfoInURL = createPersistedState('paginationInfoInURL')

export function S3Tree({ bucket = '', prefix }: { bucket: string, prefix?: string }) {
    const params = useParams()
    const navigate = useNavigate()

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

    const [ paginationInfoInURL, setPaginationInfoInURL ] = usePaginationInfoInURL(true)
    const [ pageIdx, setPageIdx ] = paginationInfoInURL ?
        useQueryParam('p', intParam(0)) :
        usePageIdx(0)
    const [ pageSize, setPageSize ] = paginationInfoInURL ?
        useQueryParam('s', intParam(20)) :
        usePageSize<number>(20)

    const [ rows, setRows ] = useState<Row[] | null>(null)
    const [ s3PageSize, setS3PageSize ] = useState(1000)
    const [ total, setTotal ] = useState<number | null>(null)
    const numPages = total === null ? null : ceil(total / pageSize)

    const cantPrv = pageIdx == 0
    const cantNxt = numPages === null || pageIdx + 1 == numPages

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
                    setPageIdx(pageIdx - 1)
                }
            } else if (e.key == '>') {
                if (!cantNxt) {
                    setPageIdx(pageIdx + 1)
                }
            }
        },
        [ bucket, key, params, pageIdx, numPages, ]
    );
    useEventListener("keypress", handler);

    console.log(`** Initializing, bucket ${bucket} key ${key}, page idx ${pageIdx} size ${pageSize} num ${numPages} total ${total}`)
    const [region, setRegion] = useState('us-east-1')
    const fetcher = useMemo(() => {
        console.log(`new fetcher for bucket ${bucket} (key ${key}), current rows:`, rows)
        return new S3Fetcher({ bucket, region, key, pageSize: s3PageSize, /*endCb: setTotal*/ })
    }, [ bucket, region, key, ])

    const start = pageSize * pageIdx
    const end = start + pageSize

    const [ totalSize, setTotalSize ] = useState<number | null>(null)
    const [ lastModified, setLastModified ] = useState<Moment | null>(null)

    useEffect(
        () => {
            fetcher.get(start, end).then(setRows)
        },
        [ fetcher, pageIdx, pageSize, bucket, key, ]
    )

    useEffect(
        () => {
            fetcher
                .computeMetadata()
                .then(( { totalSize, LastModified, }) => {
                    const total = fetcher.cache?.end
                    console.log(`Setting fetcher metadata: ${total} items, size ${totalSize}, mtime ${LastModified}`)
                    if (total !== undefined) {
                        setTotal(total)
                    }
                    setTotalSize(totalSize)
                    if (LastModified) {
                        setLastModified(moment(LastModified))
                    }
                })
        },
        [ fetcher, bucket, key, ]
    )

    const mismatchedRows = (rows || []).filter(
        row => {
            const Prefix = (row as Dir).Prefix
            const Key = Prefix ? Prefix : (row as File).Key
            return Key.substring(0, key.length) != key
        }
    )
    if (mismatchedRows.length) {
        const mismatchedKeys = mismatchedRows.map(r => (r as File).Key || (r as Dir).Prefix)
        console.warn(`Mismatched keys:`, mismatchedKeys.slice(0, 10))
    }

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

    const cache = fetcher.cache
    const numChildren = cache?.end
    const mtime = cache?.LastModified

    return (
        <div className="container">
            <div className="header row">
                <ul className="breadcrumb">
                    {
                        ancestors.map(({ key, name }) => {
                            const path = `${bucket}/${key}`
                            const url = bucketUrlRoot ? `/${bucket}/${key}` : (prefix ? `/${stripPrefix(prefix.split('/'), key)}` :`/${key}`)
                            return <li key={path}>
                                <Link to={url}>{name}</Link>
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
                            TableRow(row, { bucket, prefix: keyPieces, bucketUrlRoot, urlPrefix: prefix, })
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
