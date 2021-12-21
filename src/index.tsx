import {HashRouter, Route, Routes} from "react-router-dom";
import React, {useEffect,} from 'react';
import ReactDOM from 'react-dom'

import $ from 'jquery';
import {S3Tree} from "./s3tree";
import {QueryParamProvider} from "use-query-params";
import {RouteAdapter} from "./route-adapter";
import createPersistedState from "use-persisted-state";

const useBucket = createPersistedState('bucket')

function Router() {
    console.log("Router rendering")
    const [ bucket, setBucket ] = useBucket<string>('')
    useEffect(
        () => {
            console.log("Router computing bucket")
            if (!bucket) {
                const hostname = window.location.hostname
                const rgx = /(?<bucket>.*)\.s3(\.(?<region>[^.]+))?\.amazonaws\.com$/
                const { bucket, region } = hostname.match(rgx)?.groups || {}
                if (bucket) {
                    setBucket(bucket)
                }
            }
        },
        [bucket]
    )
    return (
        <HashRouter>
            <QueryParamProvider ReactRouterRoute={RouteAdapter}>
                <Routes>
                    <Route path="/*" element={<S3Tree bucket={bucket} />} />
                </Routes>
            </QueryParamProvider>
        </HashRouter>
    )
}

$(document).ready(function () {
    ReactDOM.render(<Router/>, document.getElementById('root'));
});
