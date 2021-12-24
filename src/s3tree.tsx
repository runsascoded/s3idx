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
import styled, {css} from "styled-components"
import * as rb from "react-bootstrap"

const githubLogo = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFNTE3OEEyQTk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFNTE3OEEyQjk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU1MTc4QTI4OTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU1MTc4QTI5OTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+m4QGuQAAAyRJREFUeNrEl21ojWEYx895TDPbMNlBK46IUiNmPvHBSUjaqc0H8pF5+aDUKPEBqU2NhRQpX5Rv5jWlDIWlMCv7MMSWsWwmb3tpXub4XXWdPHvc9/Gc41nu+nedc7/8r/99PffLdYdDPsvkwsgkTBwsA/PADJCnzX2gHTwBt8Hl7p537/3whn04XoDZDcpBlk+9P8AFcAghzRkJwPF4zGGw0Y9QS0mAM2AnQj77FqCzrtcwB1Hk81SYojHK4DyGuQ6mhIIrBWB9Xm7ug/6B/nZrBHBegrkFxoVGpnwBMSLR9EcEcC4qb8pP14BWcBcUgewMnF3T34VqhWMFkThLJAalwnENOAKiHpJq1FZgI2AT6HZtuxZwR9GidSHtI30jOrbawxlVX78/AbNfhHlomEUJJI89O2MqeE79T8/nk8nMBm/dK576hZgmA3cp/R4l9/UeSxiHLVIlNm4nFfT0bxyuIj7LHRTKai+zdJobwMKzcZSJb0ePV5PKN+BqAAKE47UlMnERELMM3EdYP/yrd+XYb2mOiYBiQ8OQnoRBlXrl9JZix7D1pHTazu4MoyBcnYamqAjIMTR8G4FT8LuhLsexXYYjICBiqhQBvYb6fLZIJCjPypVvaOoVAW2WcasCnL2Nq82xHJNSqlCeFcDshaPK0twkAhosjZL31QYw+1rlMpWGMArl23SBsZZO58F2tlJXmjOXS+s4WGvpMiBJT/I2PInZ6lIs9/hBsNS1hS6BG0DSqmYEDRlCXQrmy50P1oDRKTSegmNbUsA0zDMwRhPJXeCE3vWLPQMvan6X8AgIa1vcR4AkGZkDR4ejJ1UHpsaVI0g2LInpOsNFUud1rhxSV+fzC9Woz2EZkWQuja7/B+jUrgtIMpy9YCW4n4K41YfzRneW5E1KJTe4B2Zq1Q5EHEtj4U3AfEzR5SVY4l7QYQPJdN2as7RKBF0BPZqqH4VgMAMBL8Byxr7y8zCZiDlnOcEKIPmUpgB5Z2ww5RdOiiRiNajUmWda5IG6WbhsyY2fx6m8gLcoJDJFkH219M3We1+cnda93pfycZpIJEL/s/wSYADmOAwAQgdpBAAAAABJRU5ErkJggg=="
// const githubLogo = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ\n" +
//     "bWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp\n" +
//     "bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6\n" +
//     "eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0\n" +
//     "NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo\n" +
//     "dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw\n" +
//     "dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv\n" +
//     "IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS\n" +
//     "ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD\n" +
//     "cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFu\n" +
//     "Y2VJRD0ieG1wLmlpZDpFNTE3OEEyRTk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCIgeG1wTU06RG9j\n" +
//     "dW1lbnRJRD0ieG1wLmRpZDpFNTE3OEEyRjk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCI+IDx4bXBN\n" +
//     "TTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU1MTc4QTJDOTlBMDExRTI5\n" +
//     "QTE1QkMxMDQ2QTg5MDREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU1MTc4QTJEOTlBMDEx\n" +
//     "RTI5QTE1QkMxMDQ2QTg5MDREIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4\n" +
//     "bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+FYrpWAAABrNJREFUeNrkW2lsVFUUvjMWirYUkS5B\n" +
//     "XApUa2vd6gL+wAWjoP5RiW2EUBajAiqSuPADQ0w1UUQTrcFAUUSJEKriEuMWFKuJIElFSS24YNpQ\n" +
//     "K6WoBbuAktbva880M8O8vnfevJm+CSf5cme599xzvnfffffce17AJFjycnLzUVwDXAgUAucBY4BM\n" +
//     "IEOqdQIdwJ/Az4J64OvWtoONibQvkACHgyiuBe4CbgLOjVNlE/AZsAmoBSE9viQAjueieBCYC5yV\n" +
//     "oAvWDKwHqkBEmy8IgON09lHgXmCESY4cBaqBlSCieUgIgOPDUCwBngBOM0MjXdL/CyDiv6QRAOcv\n" +
//     "R7EBKDL+kD3AbJBQl1AC4DjrLwaeBYYbf8m/ciu+BCJ6PScAzp+K4nXgTuNveQuYAxK6PSMAzo9C\n" +
//     "8TFwtUkN2Q7cDBIOx02AOP8FUGpSSzgf3GBHQsDGec7unwOTTWrKDiGhS02ATHjvALeb1JZ3gRlW\n" +
//     "E+MpVq0yMzIekRk/1YWP6o7Ors5vHI8AXH1Odl8BaTbKrwd4j10MTAduS8JqkKvA94BPgN0A56ht\n" +
//     "Nm2OMyDDKNhuSwCcT5dIrMBG6S4oLI1qezqKBcBjwGiPHW8HVgCr0W97VL/fobjMpv2vQAnaHgv/\n" +
//     "MdYVXurAeSNPhggRw56BQatRVgL3A0H5+xDwI8Dw9g/5Hlq+clmdDYwF8iV0zpb/GP2tApZHOx4m\n" +
//     "2xwQUCC+VVqOABg+AUUDkO6AgHkwaL2DJXORxPVNylUnw+gpXObaLXFRlxHoaw7U8uoXQ99vViNg\n" +
//     "qUPnKQfsKojhdW7GuxDW5JUtIuni432hH4JhLJ7Dq6qwcZiPZnpNXDJPfI0kQEJbjVM5PiIgW3nh\n" +
//     "lkQQILH9LGWnV/iIAK0ts8TngREwDchVKrnKRwRobckVnwcIKFcq4ONrkY8IWBT2SHUq5eEE3Khs\n" +
//     "/CRm6Z1+8V5sqVQ26/M5gHuhSJ79TqUFmIhOj/ppwQ8/Rshqb5yiWXFQFhsaWeU352UU0KaXlc2m\n" +
//     "BI1+Y3OzjyO/Gm2kSAIKFQ2awfQ+v3oP23gL/K5oUhh0GPiEZG8KxP97FHULgsqwtTUFCDioqHsG\n" +
//     "CRipaHA8BQjQrAcyg4roj5KVAgSMUtRNDyqVj0wBAlQ2koBuRf3xKUBAvqJuN1eCrYpAiHNAltNj\n" +
//     "pyFYDfL47oix38wdmDA5AvYr+kjzWRgcLVcqnKfsJwGNyk5u9TEBtyjrNwaVgRClTPKA/Db8aVOZ\n" +
//     "slkDG2nD2vEuOkqGlLmYpHcGJLlJu8LjtvJFgx06Jvnq8xC33gUBeUE4waWjduua5wdVPrr6VS6c\n" +
//     "r6PvoXv5Ixed3g3mH/fB1V9OW1w07fM5IEouUEZR4bIWWJzsTRJ55r8I3ONSRRFs3hsIU8hkgkku\n" +
//     "lf0CPAx8qElQcuk4beYp9Epgoks138LOvqSPgfyAzIwMZlnFSobgIegc4H3gH6AkxmKDub9Mjb0D\n" +
//     "eoYDrZ1dne0eO14AvfPx8RXgAYaycahbBvt+GLgFpIM0md3PjqrMTMxpYKxB6p1v+s/n7bbSuMCq\n" +
//     "ldmZyc+fRh9ND+IsAxrmG3C3qtj0J1uP84hLrnwnwJbjEQRIxzw0XB2jER93C9Bog9TjsRgzLpzu\n" +
//     "Jr0BzHV6e8gwf9XoziqdCv1YE/oSTQBHwfem/3w+5syPxuukLtfdO0zk+WIs+YuPKLQ7ohzyWTIi\n" +
//     "x3joPPMTLg1d/Yg5gIL7ogf32U/4WGGhYDr+34J6bUALPpPA62w6XYMOP9BaCv3HoD/PeJubODN6\n" +
//     "U/eEq4cKTIurttpBAZ4L+87TmKdtOt0ah8FbPXS+WnyLEKskqUy5FaweM5dA2e6w+pNkZuajhfMD\n" +
//     "3/zYBfDKb3Y6+cWwgytOL7bh98nQ73BEgHReIvd4Roy/a6Cs3CRYJOnq7zjV8HWcybC33mpLLKZI\n" +
//     "A84FPRYhcSokUNL2Civnjd0MjoZbUCy0+PtNkDDD5wQsFB8sxWm2+GJZd8eSt4HnZXnZ66Nb4CHY\n" +
//     "Yxuxat4XmI1inbHeczskq77DMrK4z8AgK3+Q/L5EEMBn/PzQos0zAsQgvg5XY3TpNKOTSAD3NsrQ\n" +
//     "X63TBqq9PVHM9NgvfXi/06ZSjfNqAoQEHj9Pled+pw8cpw2co6aKbSoJxDlJnYniKdP/sqSVrrEw\n" +
//     "7IBL/TnG+rSXEy7fYVoG/S1uffDkzVEYypB1qewJRCdb5rp9yxN6mQDZFmOS2wisCIXo8Yin7w7L\n" +
//     "iKiQEcFYfhOMnBmnzo1CLIO09Qyt47niJxDQ29trTmY56Qn4X4ABAFR7IoDmVT5NAAAAAElFTkSu\n" +
//     "QmCC"

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

const FilesList = styled.table`
td,th {
    text-align: right;
    padding-right: 1rem;
}
td {
    font-family: monospace;
}
`

const GotoPageLabel = styled.span`
margin-right: 0.5rem;
`

const GotoPage = styled.input`
width: 3rem;
text-align: right;
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
const useEagerMetadata = createPersistedState('eagerMetadata')

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

    console.log(`** Initializing, bucket ${bucket} key ${key}, page idx ${pageIdx} size ${pageSize}`)
    const [region, setRegion] = useState('us-east-1')  // TODO

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
            cacheCb: cache => {
                console.log("CacheCb!", cache)
                setMetadataNonce({})
            }
        })
    }, [ bucket, region, key, fetcherNonce, ])

    const [ metadataNonce, setMetadataNonce ] = useState({})
    const cache = useMemo(
        () => {
          return fetcher.cache
        },
        [ fetcher, rows, metadataNonce, ],
    )
    const metadata = fetcher.checkMetadata()
    let { numChildren: numChildren, totalSize, LastModified } =
        metadata
            ? metadata
            : { numChildren: undefined, totalSize: undefined, LastModified: undefined }
    // `numChildren` is sometimes known even if the others aren't (it only requires paging to the end of the bucket,
    // not computing child directories' sizes recursively)
    numChildren = numChildren === undefined ? fetcher?.cache?.numChildren : numChildren
    console.log("Metadata:", metadata, "cache:", fetcher.cache)

    const numPages = numChildren === undefined ? undefined : ceil(numChildren / pageSize)

    const cantPrv = pageIdx == 0
    const cantNxt = numPages === undefined || pageIdx + 1 == numPages

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

    // const mismatchedRows = (rows || []).filter(
    //     row => {
    //         const Prefix = (row as Dir).Prefix
    //         const Key = Prefix ? Prefix : (row as File).Key
    //         return Key.substring(0, key.length) != key
    //     }
    // )
    // if (mismatchedRows.length) {
    //     const mismatchedKeys = mismatchedRows.map(r => (r as File).Key || (r as Dir).Prefix)
    //     console.warn(`Mismatched keys:`, mismatchedKeys.slice(0, 10))
    // }

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

    return (
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
                    <span className="metadatum">{numChildren === undefined ? '?' : numChildren} children,&nbsp;</span>
                    <span className="metadatum">total size {totalSize !== undefined ? renderSize(totalSize, 'iec') : '?'}{totalSize ? ` (${totalSize})` : ''},&nbsp;</span>
                    <span className="metadatum">last modified {LastModified ? moment(LastModified).format('YYYY-MM-DD') : '?'}</span>
                </MetadataEl>
            </HeaderRow>
            <DivRow>
                <FilesList>
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
                </FilesList>
            </DivRow>
            <PaginationRow>
                <PaginationButton onClick={() => setPageIdx(0)} disabled={cantPrv}>{'<<'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdx(pageIdx - 1)} disabled={cantPrv}>{'<'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdx(pageIdx + 1)} disabled={cantNxt}>{'>'}</PaginationButton>{' '}
                <PaginationButton onClick={() => setPageIdx((numPages || 0) - 1)} disabled={cantNxt}>{'>>'}</PaginationButton>{' '}
                <PageNumber>
                    Page{' '}
                    <span>{pageIdx + 1} of {numPages === null ? '?' : numPages}</span>{' '}
                </PageNumber>
                <GotoPageLabel>| Go to page:{' '}</GotoPageLabel>
                <GotoPage
                    type="number"
                    defaultValue={pageIdx + 1}
                    onChange={e => setPageIdx(e.target.value ? Number(e.target.value) - 1 : 0)}
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
            <DivRow>
                <a href="https://github.com/runsascoded/s3idx/issues">
                    {/*<img src="/assets/gh-32x32.png" />*/}
                    <img
                        src={`data:image/png;base64,${githubLogo}`}
                    />
                </a>
            </DivRow>
        </Container>
    )
}
