import moment, {isMoment, Moment} from "moment";

moment.updateLocale('en', {
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
        M:  '%dmo',
        MM: '%dmo',
        y:  '%dy',
        yy: '%dy'
    }
});

export function renderDatetime(arg: Moment | Date | string, fmt: DatetimeFmt): string {
    let m: Moment
    if (!isMoment(arg)) {
        m = moment(arg)
    } else {
        m = arg
    }
    if (fmt == 'relative') {
        return m.fromNow(true)
    } else {
        return m.format(fmt)
    }
}

export type DatetimeFmt = 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' | 'relative'
