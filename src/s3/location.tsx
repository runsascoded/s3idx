import {Params, useParams} from "react-router-dom";
import {useEffect} from "react";
import createPersistedState from "use-persisted-state";
import * as utils from "../utils"
import {UseBucketState} from "../config";
import {stripPrefix} from "../utils";

export type URLMetadata = { bucket?: string, region?: string }

export type S3LocationInfo = {
    host: string
    hostname: string
    pathname: string
    urlMetadata: URLMetadata
    isS3Domain: boolean
    bucket?: string
    urlPathPrefix?: string
}

type Ancestor = { key: string, name: string }
export type State = {
    bucket: string
    endpoint: string
    key: string
    keyPieces: string[]
    bucketUrlRoot: boolean
    useBucketState: UseBucketState
    ancestors: Ancestor[]
    params: Params
    keyUrl: (key: string) => string
}

export function parseS3LocationInfo(): S3LocationInfo {
    const { host, hostname, pathname, } = window.location
    const rgx = /((?<bucket>.*)\.)?s3(-website)?(\.(?<region>[^.]+))?\.amazonaws\.com$/
    const groups = hostname.match(rgx)?.groups as (URLMetadata | undefined)
    const urlMetadata = groups || {}
    const isS3Domain = !!groups
    let { bucket } = urlMetadata
    let urlPathPrefix
    if (isS3Domain) {
        if (bucket) {
            urlPathPrefix = pathname.replace(/\/.*?$/, '')
            console.log(`Parsed bucket ${bucket}, prefix ${urlPathPrefix} from URL hostname ${hostname}, pathname ${pathname}`)
        } else {
            const pieces = pathname.replace(/^\//, '').split('/')
            bucket = pieces[0]
            if (bucket) {
                // Redirect URLs of the form `s3.amazonaws.com/<bucket>` to `<bucket>.s3.amazonaws.com`, for
                // security reasons
                if (!bucket.includes('.')) {
                    // One exception is buckets that have a dot (`.`) in their name, for which S3's default HTTPS
                    // certificate setup doesn't work correctly at `<bucket>.s3.amazonaws.com`, and so are better
                    // viewed at `s3.amazonaws.com/<bucket>`.
                    const newUrl = `https://${bucket}.s3.amazonaws.com/index.html`
                    const msg = `Redirecting to ${newUrl}`
                    console.log(msg)
                    window.location.assign(newUrl)
                    throw Error(msg)
                }
            }
        }
    }

    return {
        host, hostname, pathname,
        urlMetadata, isS3Domain,
        bucket, urlPathPrefix,
    }
}

export function useS3Location(s3LocationInfo?: S3LocationInfo): State {
    const {
        host, hostname,
        urlMetadata, isS3Domain,
        bucket: urlBucket, urlPathPrefix,
    } = (s3LocationInfo || parseS3LocationInfo())

    const params = useParams()

    let bucket = urlBucket || ''
    const path = (params['*'] || '').replace(/\/$/, '').replace(/^\//, '')
    const pathPieces = (urlPathPrefix ? urlPathPrefix.split('/') : []).concat(path ? path.split('/') : [])
    const keyPieces = bucket ? pathPieces : pathPieces.slice(1)
    const bucketUrlRoot = !bucket
    if (!bucket) {
        bucket = pathPieces[0]
        // console.log(`Inferred bucket ${bucket} from URL path ${path}`)
    }

    let endpoint
    if (isS3Domain) {
        if (urlMetadata.bucket) {
            if (urlMetadata.bucket !== bucket) {
                throw Error(`Bucket ${bucket} doesn't match ${urlMetadata.bucket} from hostname ${hostname}`)
            }
            endpoint = `https://${host}`
        } else {
            endpoint = `https://${host}/${bucket}`
        }
    } else {
        endpoint = `https://${bucket}.s3.amazonaws.com`
        // endpoint = `https://s3.amazonaws.com/${bucket}`
    }
    // console.log(`Computed endpoint: ${endpoint} (${s3BucketEndpoint})`)

    const key = keyPieces.join('/')
    // console.log(`Render ${bucket}/${key}: params`, params, ` (prefix ${pathPrefix}), endpoint ${endpoint} (bucket endpoint? ${s3BucketEndpoint})`)

    useEffect( () => { document.title = bucket }, [ bucket ])

    function createBucketState(key: string) {
        return createPersistedState(JSON.stringify({ bucket, s3idx: key }))
    }
    function useBucketState<T>(key: string, defaultValue: T): utils.State<T> {
        const useState = createBucketState(key)
        return useState<T>(defaultValue)
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

    function keyUrl(key: string) {
        return bucketUrlRoot
            ? `/${bucket}/${key}`
            : (
                urlPathPrefix
                    ? `/${stripPrefix(urlPathPrefix.split('/'), key)}`
                    : `/${key}`
            )
    }

    return {
        bucket,
        endpoint,
        key,
        keyPieces,
        bucketUrlRoot,
        useBucketState,
        ancestors,
        params,
        keyUrl,
    }
}
