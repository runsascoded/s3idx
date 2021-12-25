import React from "react"
import _ from "lodash";

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>

export const basename = function(path: string): string {
    const idx = path.lastIndexOf('/')
    return idx == -1 ? path : path.substring(idx + 1)
}

export function stripPrefix(prefix: string[], k: string) {
    const pcs = k.split('/')
    if (!_.isEqual(prefix, pcs.slice(0, prefix.length))) {
        return k
        // throw new Error(`Key ${k} doesn't start with prefix ${prefix.join("/")}`)
    }
    return pcs.slice(prefix.length).join('/')
}

// export const encode = function(str: string): string {
//     // const encoded = encodeURIComponent(str)
//     const encoder = new TextEncoder()
//     const u8arr: number[] = Array.from(encoder.encode(str))
//     const byteString = String.fromCharCode.apply(null, u8arr)
//     const b64 = btoa(byteString)
//     const gzipped = Array.from(pako.deflate(str))
//     const bytes = String.fromCharCode.apply(null, gzipped)
//     const gz64 = btoa(bytes)
//     console.log("b64:", b64, b64.length, gz64, gz64.length)
//     return b64
// }
//
// export const decode = function(b64: string): string {
//     const arr = atob(b64).split('').map(function (c) { return c.charCodeAt(0); })
//     const u8arr = new Uint8Array(arr)
//     const decoder = new TextDecoder()
//     const str = decoder.decode(u8arr)
//     return str
// }

export const stopPropagation = (e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()
