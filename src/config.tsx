import {DatetimeFmt} from "./datetime";
import {SizeFmt} from "./size";
import * as utils from "./utils";

export type S3IdxConfig = {
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

export const DefaultConfigs: S3IdxConfig = {
    datetimeFmt: "YYYY-MM-DD HH:mm:ss",
    fetchedFmt: 'relative',
    sizeFmt: 'iec',
    eagerMetadata: false,
    ttl: '10h',
    pageSize: 20,
    s3PageSize: 1000,
    paginationInfoInURL: true,
}

export type UseBucketState = <T>(key: string, defaultValue: T) => utils.State<T>
