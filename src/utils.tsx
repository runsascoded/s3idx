import React, {Dispatch, SetStateAction} from "react"
import { isEqual } from "lodash";

export type Set<T> = Dispatch<SetStateAction<T>>
export type State<T> = [T, Set<T>]

export const basename = function(path: string): string {
    const idx = path.lastIndexOf('/')
    return idx == -1 ? path : path.substring(idx + 1)
}

export function stripPrefix(prefix: string[], k: string) {
    const pcs = k.split('/')
    if (!isEqual(prefix, pcs.slice(0, prefix.length))) {
        return k
        // throw new Error(`Key ${k} doesn't start with prefix ${prefix.join("/")}`)
    }
    return pcs.slice(prefix.length).join('/')
}

export const stopPropagation = (e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()
