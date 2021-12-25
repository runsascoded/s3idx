import moment, {Moment} from "moment";

moment.locale('en', {
    relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s:  '%ds',
        ss: '%ds',
        m:  '%dm',
        mm: '%dm',
        h:  '%dh',
        hh: '%dh',
        d:  '%dd',
        dd: '%dd',
        M:  '%dM',
        MM: '%dM',
        y:  '%dY',
        yy: '%dY'
    }
});

export function renderDatetime(m: Moment, fmt: DatetimeFmt): string {
    if (fmt == 'relative') {
        return m.fromNow(true)
    } else {
        return m.format(fmt)
    }
}

export type DatetimeFmt = 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' | 'relative'
