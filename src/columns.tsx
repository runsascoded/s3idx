import {DatetimeFmt} from "./datetime";
import {SizeFmt} from "./size";
import createPersistedState from "use-persisted-state";

const useDatetimeFmt = createPersistedState('datetimeFmt')
const useFetchedFmt = createPersistedState('fetchedFmt')
const useSizeFmt = createPersistedState('sizeFmt')

export function useColumns(
    { config, }: {
        config: {
            datetimeFmt: DatetimeFmt
            fetchedFmt: DatetimeFmt
            sizeFmt: SizeFmt
        }
    }
) {
    const [ datetimeFmt, setDatetimeFmt ] = useDatetimeFmt<DatetimeFmt>(config.datetimeFmt)
    const [ fetchedFmt, setFetchedFmt ] = useFetchedFmt<DatetimeFmt>(config.fetchedFmt)
    const [ sizeFmt, setSizeFmt ] = useSizeFmt<SizeFmt>(config.sizeFmt)

    return {
        datetimeFmt, setDatetimeFmt,
        fetchedFmt, setFetchedFmt,
        sizeFmt, setSizeFmt,
    }
}
