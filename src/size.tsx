const {round} = Math

export type SizeFmt = 'bytes' | 'iec' | 'iso'
type Size = { num: number, suffix?: string }

export const renderHumanReadableSize = function(
    {
        size,
        iec = true,
        short = false,
    }: {
        size: number
        iec: boolean
        short: boolean
    }
): Size {
    const orders = [ 'K', 'M', 'G', 'T', 'P', 'E', ]
    const suffix = short ? '' : (iec ? 'iB' : 'B')
    const base = iec ? 1024 : 1000
    const [ n, o, ] = orders.reduce<[ number, string, ]>(
        ([size, curOrder], nxtOrder) => {
            if (size < base) {
                return [ size, curOrder ]
            } else {
                return [ size / base, nxtOrder]
            }
        },
        [ size, '', ],
    )
    if (!o) {
        return { num: n, suffix: 'B' }
    }
    return { num: n, suffix: `${o}${suffix}` }
}

const sizeSuffixer = {
    'iec': (size: number, short: boolean): Size => renderHumanReadableSize({ size, iec: true, short, }),
    'iso': (size: number, short: boolean): Size => renderHumanReadableSize({ size, iec: false, short, }),
    'bytes': (size: number): Size => { return { num: size } }
}

export const computeSize = (size: number, fmt: SizeFmt, short: boolean): Size => sizeSuffixer[fmt](size, short)

export const renderSize = (
    { size, fmt, short, }: {
        size: number
        fmt: SizeFmt
        short?: boolean
    }
): string => {
    const { num: n, suffix } = sizeSuffixer[fmt](size, !!short)
    const rendered = n >= 100 ? round(n).toString() : n.toFixed(1)
    return `${rendered}${suffix || ""}`
}
