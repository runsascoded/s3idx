import {
    CommonPrefix,
    LastModified,
    ListObjectsV2Output,
    ListObjectsV2Request,
    Object,
    ObjectKey,
    Size,
} from "aws-sdk/clients/s3";
import moment, {Duration, DurationInputArg2, Moment} from "moment";
import AWS from "aws-sdk";

const { ceil, floor, max, min } = Math

export type File = {
    Key: ObjectKey,
    LastModified: LastModified,
    Size: Size,
}

export type Dir = {
    Prefix: string
    LastModified?: LastModified
    Size?: Size
}

export type Page = {
    dirs: Dir[]
    files: File[]
}
export function Page(page: ListObjectsV2Output): Page {
    const dirs = (page?.CommonPrefixes || []).map(Dir)
    const files = (page?.Contents || []).map(File)
    return { dirs, files }
}

export type Row = File | Dir

export type Cache = {
    pages: ListObjectsV2Output[]
    timestamp: Moment
    numChildren?: number
    totalSize?: number
    LastModified?: LastModified
}

export function File({ Key, LastModified, Size, }: Object): File {
    if (Key === undefined || LastModified === undefined || Size === undefined) {
        throw Error(`Object missing required field(s): Key ${Key}, LastModified ${LastModified}, Size ${Size}`)
    }
    return { Key, LastModified, Size, }
}

export function Dir({ Prefix }: CommonPrefix): Dir {
    if (Prefix === undefined) {
        throw Error(`CommonPrefix missing Prefix: ${Prefix}`)
    }
    return { Prefix: Prefix.replace(/\/$/, '') }
}

type Metadata = {
    numChildren: number
    totalSize: number
    LastModified?: LastModified
}

const combineMetadata = (
    {
        numChildren: lc,
        totalSize: ls,
        LastModified: lm,
    }: Metadata, {
        numChildren: rc,
        totalSize: rs,
        LastModified: rm,
    }: Metadata
) => {
    return {
        numChildren: lc + rc,
        totalSize: ls + rs,
        LastModified: lm === undefined ? rm : rm === undefined ? lm : lm > rm ? lm : rm,
    }
}

export class S3Fetcher {
    bucket: string
    key?: string
    pageSize: number
    pagePromises: Promise<ListObjectsV2Output>[] = []
    cacheCb?: (cache: Cache) => void
    s3?: AWS.S3
    IdentityPoolId?: string
    cache?: Cache
    cacheKey: string
    ttl?: Duration

    constructor(
        {
            bucket,
            region,
            key,
            IdentityPoolId,
            ttl,
            pageSize,
            cacheCb,
        }: {
            bucket: string,
            region?: string,
            key?: string,
            IdentityPoolId?: string,
            ttl?: string,
            pageSize?: number,
            cacheCb?: (cache: Cache) => void,
        }
    ) {
        this.bucket = bucket
        key =  key?.replace(/\/$/, '')
        this.key = key
        this.pageSize = pageSize || 1000
        this.IdentityPoolId = IdentityPoolId
        this.cacheCb = cacheCb

        if (region) {
            AWS.config.region = region;
        }
        if (IdentityPoolId) {
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId, });
        }
        this.s3 = new AWS.S3({});
        const cacheKeyObj = key ? { bucket, key } : { bucket }
        this.cacheKey = JSON.stringify(cacheKeyObj)
        const cacheStr = localStorage.getItem(this.cacheKey)
        // console.log(`Cache:`, cacheKeyObj, `${this.cacheKey} (key: ${key})`)
        if (cacheStr) {
            const { pages, timestamp, numChildren, totalSize, LastModified, } = JSON.parse(cacheStr)
            this.cache = { pages, timestamp: moment(timestamp), numChildren, totalSize, LastModified, }
        }
        if (ttl) {
            const groups = ttl.match(/(?<n>\d+)(?<unit>.*)/)?.groups
            if (!groups) {
                throw Error(`Unrecognized ttl: ${ttl}`)
            }
            const n = parseInt(groups.n)
            const unit: DurationInputArg2 = groups.unit as DurationInputArg2
            this.ttl = moment.duration(n, unit)
        } else {
            this.ttl = moment.duration(1, 'd')
        }
        this.checkCacheTtl()
    }

    get(start: number, end: number): Promise<Row[]> {
        const { pageSize, } = this
        const startPage = floor(start / pageSize)
        const endPage = ceil(end / pageSize)
        const pageIdxs: number[] = Array.from(Array(endPage - startPage).keys()).map(i => startPage + i)
        const pages: Promise<ListObjectsV2Output>[] = pageIdxs.map(idx => this.getPage(idx))
        const slicedPages: Promise<Row[]>[] =
            pages.map(
                (pagePromise, idx) => pagePromise.then(
                    page => {
                        const pageIdx = startPage + idx
                        const pageStart = pageIdx * pageSize
                        const startIdx = max(start - pageStart, 0)
                        const endIdx = min(end - pageStart, pageSize)
                        const { dirs, files } = Page(page)
                        const rows = (dirs as Row[]).concat(files)
                        return rows.slice(startIdx, endIdx)
                    }
                )
            )
        return Promise.all(slicedPages).then(values => ([] as Row[]).concat(...values))
    }

    saveCache() {
        if (!this.cache) {
            localStorage.removeItem(this.cacheKey)
        } else {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.cache))
        }
        if (this.cacheCb && this.cache)
            this.cacheCb(this.cache)
    }

    dirs(): S3Fetcher[] | undefined {
        const { bucket, cache } = this
        if (cache) {
            const {pages, numChildren} = cache
            if (numChildren !== undefined) {
                // console.log(`Cache: purging pages under ${bucket}/${key}`)
                return ([] as S3Fetcher[]).concat(
                    ...pages.map(Page).map(page =>
                        page.dirs.map(dir =>
                            new S3Fetcher({bucket, key: dir.Prefix,})
                        )
                    )
                )
            }
        }
    }

    checkMetadata(): Metadata | undefined {
        const { bucket, cache } = this
        if (cache) {
            const { numChildren, totalSize, LastModified, } = cache
            if (numChildren !== undefined && totalSize !== undefined && LastModified !== undefined) {
                return { numChildren, totalSize, LastModified, }
            }
        }
        const result = this.reduceSync<Metadata>(
            dir => {
                const metadata =
                    new S3Fetcher({ bucket, key: dir.Prefix, })
                        .checkMetadata()
                if (!metadata) return
                const { totalSize, LastModified } = metadata
                return { numChildren: 1, totalSize, LastModified }
            },
            ({ Size, LastModified, }) => {
                return { numChildren: 1, totalSize: Size, LastModified, }
            },
            combineMetadata,
            { totalSize: 0, numChildren: 0 }
        )
        if (result) {
            const { numChildren, totalSize, LastModified } = result
            if (this.cache) {
                this.cache.numChildren = numChildren
                this.cache.totalSize = totalSize
                this.cache.LastModified = LastModified
                this.saveCache()
            } else {
                throw Error(`Got checkMetadata result without cache present`)
            }
        }
        return result
    }

    clearCache() {
        if (this.cache) {
            this.dirs()?.forEach(dir => dir.clearCache())
            this.cache = undefined
            this.saveCache()
        }
    }

    checkCacheTtl(): Cache | undefined {
        const { cache, ttl } = this
        if (cache) {
            const { timestamp, } = cache
            const now = moment()
            if (timestamp.add(ttl) < now) {
                this.cache = undefined
                this.saveCache()
            }
        }
        return this.cache
    }

    getPage(pageIdx: number): Promise<ListObjectsV2Output> {
        const { pagePromises, bucket, key, } = this
        // console.log(`Fetcher ${bucket} (${key}):`, cache)
        const cache = this.checkCacheTtl()
        if (cache) {
            const { pages } = cache
            if (pageIdx in pages) {
                // console.log(`Cache hit: ${pageIdx} (timestamp ${this.cache?.timestamp})`)
                return Promise.resolve(pages[pageIdx])
            }
            // console.log(`Cache miss: ${pageIdx} (timestamp ${this.cache?.timestamp})`)
        }
        if (pageIdx < pagePromises.length) {
            return pagePromises[pageIdx]
        }
        return this.nextPage().then(() => this.getPage(pageIdx))
    }

    reduce<T>(
        dirFn: (dir: Dir) => Promise<T>,
        fileFn: (file: File) => Promise<T>,
        fn: (cur: T, nxt: T) => T,
        init: T,
        cb?: (t: T) => void,
        pageIdx: number = 0,
    ): Promise<T> {
        return this.getPage(pageIdx).then(page => {
            const { dirs, files } = Page(page)

            const dirResults = Promise.all(dirs.map(dirFn)).then(results => results.reduce(fn, init))
            const fileResults = Promise.all(files.map(fileFn)).then(results => results.reduce(fn, init))
            const restPromise = page.IsTruncated ? this.reduce(dirFn, fileFn, fn, init, cb, pageIdx + 1) : Promise.resolve(undefined)
            const result = Promise.all([
                dirResults,
                fileResults,
                restPromise,
            ])
                .then(([ dirs, files, rest, ]) => {
                    const cur = fn(dirs, files)
                    return rest === undefined ? cur : fn(cur, rest)
                })
            return (
                cb ?
                    result.then(total => {
                        cb(total)
                        return total
                    }) :
                    result
            )
        })
    }

    reduceSync<T>(
        dirFn: (dir: Dir) => T | undefined,
        fileFn: (file: File) => T,
        fn: (cur: T, nxt: T) => T,
        init: T,
    ): T | undefined {
        const { cache } = this
        if (!cache) return
        if (cache.numChildren === undefined) return
        let pagesResult: T | undefined = init
        for (const page of cache.pages) {
            const { files, dirs } = Page(page)
            let dirsResult: T | undefined = init
            for (const dir of dirs) {
                const value = dirFn(dir)
                if (value === undefined) {
                    return undefined
                }
                dirsResult = fn(dirsResult, value)
            }
            // const dirResults = dirs.map(dirFn).reduce(fn, init)
            const filesResult = files.map(fileFn).reduce(fn, init)
            const result = fn(dirsResult, filesResult)
            pagesResult = fn(pagesResult, result)
        }
        return pagesResult
    }

    computeMetadata(): Promise<Metadata> {
        const { bucket, key } = this
        const cached = { totalSize: this.cache?.totalSize, LastModified: this.cache?.LastModified }
        if (cached.totalSize !== undefined && cached.LastModified !== undefined) {
            // console.log(`computeMetadata: ${bucket}/${key} cache hit`)
            return Promise.resolve(cached as Metadata)
        }
        // console.log(`computeMetadata: ${bucket}/${key}; computing`)
        return (
            this.reduce<Metadata>(
                dir =>
                    new S3Fetcher({ bucket, key: dir.Prefix }).computeMetadata().then(
                        ({ totalSize, LastModified }) => {
                            return { numChildren: 1, totalSize, LastModified }
                        }
                    ),
                ({Size, LastModified,}) => Promise.resolve({ totalSize: Size, LastModified, numChildren: 1 }),
                combineMetadata,
                { totalSize: 0, numChildren: 0, },
                ({ numChildren, totalSize, LastModified, }) => {
                    if (this.cache) {
                        // console.log(`Setting metadata for ${bucket}/${key}: totalSize ${totalSize}, mtime ${LastModified}`)
                        this.cache.numChildren = numChildren
                        this.cache.totalSize = totalSize
                        this.cache.LastModified = LastModified
                        this.saveCache()
                    } else {
                        console.warn(`No cache for ${bucket}/${key}, dropping metadata: totalSize ${totalSize}, mtime ${LastModified}`)
                    }
                }
            )
        )
    }

    fileMetadata(): Metadata | undefined {
        const pages = this.cache?.pages
        if (!pages) return
        const files = ([] as File[]).concat(...pages.map(page => Page(page).files))
        return (
            files
                .map(({ Size, LastModified, }) => { return { numChildren: 1, totalSize: Size, LastModified, }})
                .reduce<Metadata>(combineMetadata, { totalSize: 0, numChildren: 0, })
        )
    }

    nextPage(): Promise<ListObjectsV2Output> {
        const { bucket, key, s3, pageSize, IdentityPoolId, } = this
        const Prefix = key ? (key[key.length - 1] == '/' ? key : (key + '/')) : key
        if (!s3) {
            throw Error("S3 client not initialized")
        }
        let continuing: Promise<string | undefined>
        const numPages = this.pagePromises.length
        const pageIdx = numPages
        if (numPages) {
            continuing =
                this.pagePromises[numPages - 1]
                    .then(last => {
                        if (last.IsTruncated || !last.NextContinuationToken) {
                            throw new Error(
                                `Asked for next page (idx ${numPages}) but page ${numPages - 1} is truncated ` +
                                `(${last.IsTruncated}, ${last.NextContinuationToken}, ${last.Contents?.length} items)`
                            )
                        }
                        return last.NextContinuationToken
                    })
        } else {
            continuing = Promise.resolve(undefined)
        }

        const page = continuing.then(ContinuationToken => {
            const params: ListObjectsV2Request = {
                Bucket: bucket,
                Prefix,
                MaxKeys: pageSize,
                Delimiter: '/',
                ContinuationToken,
            };
            // console.log(`Fetching page idx ${numPages}`)
            const timestamp = moment()
            const pagePromise: Promise<ListObjectsV2Output> =
                IdentityPoolId ?
                    s3.listObjectsV2(params).promise() :
                    s3.makeUnauthenticatedRequest('listObjectsV2', params).promise()
            return pagePromise.then(page => {
                const truncated = page.IsTruncated
                const numFiles = page.Contents?.length || 0
                const numDirs = page.CommonPrefixes?.length || 0
                const numChildren = numFiles + numDirs
                // console.log(
                //     `Got page idx ${numPages} (${numItems} items, truncated ${truncated}, continuation ${page.NextContinuationToken})`
                // )
                let saveCache
                let cache: Cache
                if (!this.cache) {
                    let pages = []
                    pages[pageIdx] = page
                    this.cache = { pages, timestamp, }
                    // console.log("Fresh cache:", this.cache)
                    saveCache = true
                    cache = this.cache
                } else {
                    this.cache.pages[pageIdx] = page
                    // console.log(`Cache page idx ${pageIdx}:`, page)
                    if (timestamp < this.cache.timestamp) {
                        // console.log(`Cache page idx ${pageIdx}: timestamp ${this.cache.timestamp} → ${timestamp}`)
                        this.cache.timestamp = timestamp
                    }
                    saveCache = true
                    cache = this.cache
                }
                if (!truncated) {
                    this.cache.numChildren = numPages * pageSize + numChildren
                    // const pages = cache.pages
                    // const allDirs = ([] as Dir[]).concat(...pages.map(page => Page(page).dirs))

                    //const allDirsComputed = allDirs.reduce((allsoFar, dir) => allSoFar && dir.cach)
                    // if (!numDirs) {
                    //     const files = ([] as File[]).concat(...pages.map(page => Page(page).files))
                    //     const { totalSize, LastModified } = (
                    //         files
                    //             .map(({ Size, LastModified, }) => { return { totalSize: Size, LastModified, }})
                    //             .reduce<Metadata>(combineMetadata, { totalSize: 0, numChildren: 0 })
                    //     )
                    //     console.assert(this.cache)
                    //     this.cache.totalSize = totalSize
                    //     this.cache.LastModified = LastModified
                    // }
                    saveCache = true
                }
                if (saveCache) {
                    this.saveCache()
                }
                return page
            })
        })
        this.pagePromises.push(page)
        return page
    }
}
