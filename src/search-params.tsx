import {QueryParamConfig, useQueryParam} from "use-query-params";
import { entries, isEqual, } from "lodash";
import {Location} from "react-router-dom";
const { isArray } = Array

export type HandleUnexpectedValue = 'Default' | 'Warn' | 'Throw'

const { fromEntries: obj } = Object

export function returnDefaultOrError<D>(value: any, rv: D, handleUnexpectedValue: HandleUnexpectedValue): D {
    if (handleUnexpectedValue === 'Default') {
        return rv
    } else {
        const error = `Unexpected value ${value} in decoded query param; returning default ${rv}`
        if (handleUnexpectedValue === 'Warn') {
            console.error(error)
            return rv
        } else {
            throw new Error(error)
        }
    }
}

export function enumParam<D extends string>(
    {
        values,
        defaultValue,
        handleUnexpectedValue = 'Warn',
    }: {
        values: (D | [ D, string ])[],
        handleUnexpectedValue?: HandleUnexpectedValue,
        defaultValue?: D,
    }
): QueryParamConfig<D> {
    const vals: { d: D, s: string}[] = values.map(v => isArray(v) ? { d: v[0], s: v[1], } : { d: v, s: v, })
    const defValue = defaultValue === undefined ? vals[0].d : defaultValue
    return {
        encode(value: D): string | (string | null)[] | null | undefined {
            if (value == defValue) return undefined
            const s = vals.find(({ d, s }) => value == d)?.s
            return (s === undefined)
                ? returnDefaultOrError(value, undefined, handleUnexpectedValue)
                : s
        },
        decode(value: string | (string | null)[] | null | undefined): D {
            if (value === undefined) return defValue
            if (value === null) {
                return returnDefaultOrError(value, defValue, handleUnexpectedValue)
            }
            if (typeof value === 'string') {
                const found = vals.find(({ d, s }) => s == value)?.d
                return (found === undefined) ? returnDefaultOrError(value, defValue, handleUnexpectedValue) : found
            } else {
                const ds: D[] = value.map(v => values.find(d => d == v)).filter((d): d is D => d !== undefined)
                const length = ds.length
                if (!length) {
                    return returnDefaultOrError(value, defValue, handleUnexpectedValue)
                }
                const last = ds[length - 1]
                return (length > 1)
                    ? returnDefaultOrError(value, last, handleUnexpectedValue)
                    : last
            }
        },
    }
}

export function enumMultiParam<D extends string>(
    {
        entries,
        defaultValue,
        handleUnexpectedValue = 'Warn',
        delimiter,
    }: {
        entries: [ D, string ][],
        handleUnexpectedValue?: HandleUnexpectedValue,
        defaultValue?: D[],
        delimiter?: string,
    }
): QueryParamConfig<D[]> {
    const defValue = defaultValue === undefined ? [] : defaultValue
    const eq = isEqual
    const delim = delimiter === undefined ? ',' : delimiter
    // entries = entries.map
    const d2s: { [k: string]: string } = obj(entries.map(([ d, s ]) => [ d as string, s, ]))
    const s2d: { [k: string]: D } = obj(entries.map(([ value, rendered ]) => [ rendered, value ]))
    return {
        encode(value: D[]): string | (string | null)[] | null | undefined {
            return eq(value, defValue) ? undefined : value.map(d => d2s[d]).join(delim)
        },
        decode(value: string | (string | null)[] | null | undefined): D[] {
            if (value === undefined) return defValue
            if (value === null) {
                return returnDefaultOrError(value, defValue, handleUnexpectedValue)
            }
            if (typeof value === 'string') {
                return (
                    value
                        .split(delim)
                        .map(s => s2d[s])
                        .filter((d: D | undefined): d is D => {
                            if (d === undefined) {
                                returnDefaultOrError(d, defaultValue, handleUnexpectedValue)
                                return false
                            } else {
                                return true
                            }
                        })
                )
            } else {
                const arrays: D[][] = value.map(v => this.decode(v))
                return Array.from(new Set<D>(([] as D[]).concat(...arrays)))
            }
        },
    }
}

export function boolParam(
    {
        defaultValue = false,
        handleUnexpectedValue = "Warn",
    }: {
        defaultValue?: boolean,
        handleUnexpectedValue?: HandleUnexpectedValue,
    } = {}
): QueryParamConfig<boolean> {
    return {
        encode(value: boolean): string | (string | null)[] | null | undefined {
            return value == defaultValue
                ? undefined
                : defaultValue
                    ? ''  // default true, value false -> `?foo=`
                    : null  // default false, value true -> `?foo`
        },
        decode(value: string | (string | null)[] | null | undefined): boolean {
            if (value === undefined) return defaultValue
            if (value === null) return true
            if (value === '') return false
            return returnDefaultOrError(value, defaultValue, handleUnexpectedValue)
        },
    }
}

export function useEnumQueryParam<T extends string>(k: string, values: (T | [ T, string ])[]) {
    return useQueryParam<T>(k, enumParam<T>({ values }))
}

export function useEnumMultiParam<T extends string>(
    k: string,
    { entries, defaultValue, handleUnexpectedValue = 'Warn', delimiter, }: {
        entries: [ T, string ][],
        handleUnexpectedValue?: HandleUnexpectedValue,
        defaultValue?: T[],
        delimiter?: string,
    }
) {
    return useQueryParam<T[]>(k, enumMultiParam<T>({ entries, handleUnexpectedValue, defaultValue, delimiter, }))
}

export const defaultReplaceChars = { '%2F': '/', '%21': '!', }

export function stringParam(defaultValue: string = ''): QueryParamConfig<string> {
    return {
        encode: (value: string) => value == defaultValue ? undefined : value.toString(),
        decode: (value: string | (string | null)[] | null | undefined): string => {
            if (typeof value === 'string') {
                return value
            }
            if (!value) return defaultValue
            const n = value.length
            if (!n) return defaultValue
            const last = value[n - 1]
            return last === null ? defaultValue : last
        }
    }
}

export function intParam(defaultValue: number): QueryParamConfig<number> {
    return {
        encode: (value: number) => value == defaultValue ? undefined : value.toString(),
        decode: (value: string | (string | null)[] | null | undefined): number => {
            if (typeof value === 'string') {
                return parseInt(value)
            }
            if (!value) return defaultValue
            const n = value.length
            if (!n) return defaultValue
            const last = value[n - 1]
            return last ? parseInt(last) : defaultValue
        }
    }
}

export function buildQueryString(o: { [k: string]: string }, location: Location, searchParams?: URLSearchParams,) {
    let sp: URLSearchParams
    if (!searchParams) {
        const { search: query } = location;
        sp = new URLSearchParams(query)
    } else {
        sp = searchParams
    }
    entries(o).forEach(([ k, v ]) => {
        sp.set(k, v)
    })
    let queryString = sp.toString()
    const replaceChars = defaultReplaceChars
    //replaceChars = replaceChars || defaultReplaceChars
    Object.entries(replaceChars).forEach(([ k, v ]) => {
        queryString = queryString.replaceAll(k, v)
    })
    return queryString
}
