import moment, {Moment} from "moment";

moment.locale('en', {
    relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s:  'seconds',
        ss: '%ss',
        m:  'a minute',
        mm: '%dm',
        h:  'an hour',
        hh: '%dh',
        d:  'a day',
        dd: '%dd',
        M:  'a month',
        MM: '%dM',
        y:  'a year',
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
