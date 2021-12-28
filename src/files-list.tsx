import styled from "styled-components";
import {Header, HeaderSettings} from "./column/header";
import {Set, stripPrefix} from "./utils";
import {Link} from "react-router-dom";
import {DatetimeFmt, renderDatetime} from "./datetime";
import React, {FC} from "react";
import {renderSize as szRenderSize, SizeFmt} from "./size";
import {Option} from "./control/radios";
import {Props as TooltipProps} from './tooltip'
import {Dir, Fetcher, File, Row} from "./s3/fetcher";
import {Duration, Moment} from "moment";
import {CredentialsOptions} from "aws-sdk/lib/credentials";

const Table = styled.table`
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

// First table row ("total")

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

//

function renderSize(size: number | undefined, fmt: SizeFmt) {
    return size !== undefined
        ? szRenderSize({ size, fmt, short: fmt === 'iec', })
        : '?'
}

function DirRow(
    { Prefix: key }: Dir,
    { bucket, duration, datetimeFmt, fetchedFmt, sizeFmt, credentials, endpoint, keyUrl, }: {
        bucket: string,
        duration: Duration,
        datetimeFmt: DatetimeFmt,
        fetchedFmt: DatetimeFmt,
        sizeFmt: SizeFmt,
        credentials?: CredentialsOptions,
        endpoint?: string,
        keyUrl: (key: string) => string
    },
) {
    const pieces = key.split('/')
    const name = pieces[pieces.length - 1]
    const fetcher = new Fetcher({
        bucket, key,
        ttl: duration,
        credentials,
        endpoint,
    })
    const totalSize = fetcher.cache?.totalSize
    const mtime = fetcher.cache?.LastModified
    const timestamp = fetcher.cache?.timestamp
    const url = keyUrl(key)
    return <tr key={key}>
        <td key="name">
            <Link to={url}>{name}</Link>
        </td>
        <td key="size">{renderSize(totalSize, sizeFmt)}</td>
        <td key="mtime">{mtime ? renderDatetime(mtime, datetimeFmt) : '?'}</td>
        <td key="fetched">{timestamp ? renderDatetime(timestamp, fetchedFmt) : '?'}</td>
    </tr>
}

function FileRow(
    { Key, LastModified, Size, }: File,
    { prefix, datetimeFmt, fetchedFmt, sizeFmt, timestamp, }: {
        prefix: string[],
        datetimeFmt: DatetimeFmt,
        fetchedFmt: DatetimeFmt,
        sizeFmt: SizeFmt,
        timestamp?: Moment,
    }
) {
    return <tr key={Key}>
        <td key="name">{Key ? stripPrefix(prefix, Key) : ""}</td>
        <td key="size">{renderSize(Size, sizeFmt)}</td>
        <td key="mtime">{renderDatetime(LastModified, datetimeFmt)}</td>
        <td key="fetched">{timestamp ? renderDatetime(timestamp, fetchedFmt) : '?'}</td>
    </tr>
}

function TableRow(
    row: Row,
    extra: {
        bucket: string
        duration: Duration
        prefix: string[]
        datetimeFmt: DatetimeFmt
        fetchedFmt: DatetimeFmt
        sizeFmt: SizeFmt
        credentials?: CredentialsOptions
        endpoint?: string
        timestamp?: Moment
        keyUrl: (key: string) => string
    }
) {
    return (
        (row as Dir).Prefix !== undefined
            ? DirRow(row as Dir, extra)
            : FileRow(row as File, extra)
    )
}

namespace ns {
    export interface Props {
        rows: Row[],
        bucket: string, keyPieces: string[],
        ancestors: { key: string, name: string }[],
        sizeFmt: SizeFmt, setSizeFmt: Set<SizeFmt>,
        datetimeFmt: DatetimeFmt, setDatetimeFmt: Set<DatetimeFmt>,
        Tooltip: FC<TooltipProps>,
        totalSize?: number,
        LastModified?: Moment | null,
        timestamp?: Moment,
        duration: Duration,
        fetchedFmt: DatetimeFmt,
        credentials?: CredentialsOptions,
        endpoint: string,
        keyUrl: (key: string) => string
    }

    export const FilesList = (
        {
            rows,
            bucket, keyPieces,
            ancestors,
            sizeFmt, setSizeFmt,
            datetimeFmt, setDatetimeFmt,
            Tooltip,
            totalSize, LastModified, timestamp,
            duration,
            fetchedFmt,
            credentials, endpoint,
            keyUrl,
        }: Props
    ) => {

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
            <Table>
                <thead>
                <tr>
                    <th key="name">Name</th>
                    <th key="size">
                        {Header({
                            label: 'Size',
                            headerSettings: sizeHeaderSettings,
                            Tooltip,
                        })}
                    </th>
                    <th key="mtime">
                        {Header({
                            label: 'Modified',
                            headerSettings: datetimeHeaderSettings,
                            Tooltip,
                        })}
                    </th>
                    <th key="fetched">
                        {Header({
                            label: 'Fetched',
                            Tooltip,
                        })}
                    </th>
                </tr>
                </thead>
                <tbody>
                <TotalRow>
                    <td key="name"><InlineBreadcrumbs>
                        {
                            ancestors.map(({ key, name }) => {
                                const path = `${bucket}/${key}`
                                const url = keyUrl(key)
                                return <InlineBreadcrumb key={path}>
                                    <Link to={url}>{name}</Link>
                                </InlineBreadcrumb>
                            })
                        }
                    </InlineBreadcrumbs></td>
                    <td key="size">{renderSize(totalSize, sizeFmt)}</td>
                    <td key="mtime">{
                        LastModified
                            ? renderDatetime(LastModified, datetimeFmt)
                            : (LastModified === null ? '∅' : '?')
                    }</td>
                    <td>{
                        timestamp
                            ? renderDatetime(timestamp, fetchedFmt)
                            : '?'
                    }</td>
                </TotalRow>
                {
                    rows.map(row =>
                        TableRow(
                            row,
                            {
                                bucket,
                                prefix: keyPieces,
                                duration,
                                datetimeFmt,
                                fetchedFmt,
                                sizeFmt,
                                credentials,
                                endpoint,
                                timestamp,
                                keyUrl,
                            }
                        )
                    )
                }
                </tbody>
            </Table>
        )
    }
}

export default ns;
export const FilesList = ns.FilesList
