import {Button, DivRow, SettingsLabel} from "./style";
import React, {FC, useRef} from "react";
import styled from "styled-components";
import { Set } from "./utils"
import {tooltipClasses} from "@mui/material/Tooltip";
import { Props as TooltipProps } from "./tooltip"
import {URLMetadata} from "./s3/location";

// Credentials

const Div = styled.div`
    table.credentials {
        margin-bottom: 0.5em;
    }
    td:first-child {
        padding-right: 0.4em;
        text-align: right;
    }
    td {
        padding-bottom: 0.2em;
    }
    input.credential {
        padding: 0.3em 0.5em;
        width: 20em;
        border 1px solid black;
    }
    tr {
        line-height: 1.2em;
        /*margin-bottom: 0.2em;*/
    }
`
const UpdateCredentials = styled(Button)`
    padding: 0.3em 0.7em;
`

const AuthLabel = styled.span`
    ${SettingsLabel}
    font-size: 2.2em;
`

export interface Props {
    region?: string, setRegion: Set<string | undefined>
    urlMetadata: URLMetadata
    isS3Domain: boolean
    accessKeyId: string | null, setAccessKeyId: Set<string | null>
    secretAccessKey: string | null, setSecretAccessKey: Set<string | null>
    setNeedsAuth: Set<boolean>
}

export const Credentials = (
    {
        region, setRegion,
        urlMetadata,
        isS3Domain,
        accessKeyId, setAccessKeyId,
        secretAccessKey, setSecretAccessKey,
        setNeedsAuth,
    }: Props
) => {
    const inputRegion = useRef<HTMLInputElement | null>(null)
    const inputAccessKey = useRef<HTMLInputElement | null>(null)
    const inputSecretKey = useRef<HTMLInputElement | null>(null)

    return (
        <Div>
            <table className="credentials">
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
                            disabled={isS3Domain && !urlMetadata.bucket}
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
                            disabled={isS3Domain && !urlMetadata.bucket}
                            placeholder="Secret key"
                            defaultValue={secretAccessKey || ''}
                            ref={inputSecretKey}
                        />
                    </td>
                </tr>
                </tbody>
            </table>
            <DivRow>
                <UpdateCredentials onClick={() => {
                    const region = inputRegion.current?.value
                    const accessKey = inputAccessKey.current?.value
                    const secretKey = inputSecretKey.current?.value
                    console.log("Credentials:", region , accessKey, secretKey ? '*'.repeat(secretKey.length) : undefined)
                    setRegion(region)
                    if (accessKey) {
                        setAccessKeyId(accessKey)
                        setNeedsAuth(false)
                    }
                    if (secretKey) {
                        setSecretAccessKey(secretKey)
                        setNeedsAuth(false)
                    }
                }}>
                    Update
                </UpdateCredentials>
            </DivRow>
        </Div>
    )
}

export const AuthSettings = (
    { Credentials, Tooltip, }: {
        Credentials: () => JSX.Element
        Tooltip: FC<TooltipProps>
    }
) => {
    return (
        <Tooltip
            id={"auth"}
            placement={"bottom"}
            css={{
                [`& .${tooltipClasses.tooltip}`]: {
                    maxWidth: '30em',
                    padding: '0.8rem',
                },
            }}
            title={<div>{Credentials()}</div>}
        >
            <AuthLabel>🔒</AuthLabel>
        </Tooltip>
    )
}

export default Credentials
