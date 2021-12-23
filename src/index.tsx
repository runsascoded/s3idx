import {HashRouter, Route, Routes} from "react-router-dom";
import React from 'react';
import ReactDOM from 'react-dom'

import $ from 'jquery';
import {S3Tree} from "./s3tree";
import {QueryParamProvider} from "use-query-params";
import {RouteAdapter} from "./route-adapter";

function Router() {
    console.log("Router rendering")
    const { hostname, pathname, } = window.location
    const rgx1 = /(?<bucket>.*)\.s3(\.(?<region>[^.]+))?\.amazonaws\.com$/
    const rgx2 = /(?<bucket>.*)\.s3-website(-(?<region>[^.]+))?\.amazonaws\.com$/
    const match = hostname.match(rgx1) || hostname.match(rgx2)
    let { bucket } = match?.groups || {}
    let prefix
    if (bucket) {
        prefix = pathname.replace(/\/.*?$/, '')
        console.log(`Parsed bucket ${bucket}, prefix ${prefix} from URL hostname ${hostname} / pathname ${pathname}`)
    } else {
        const rgx = /s3(\.(?<region>[^.]+))?\.amazonaws\.com$/
        if (hostname.match(rgx)) {
            const pieces = pathname.replace(/^\//, '').split('/')
            bucket = pieces[0]
            if (bucket) {
                prefix = pieces.slice(1, pieces.length - 1).join('/')
                console.log(`Parsed bucket ${bucket}, prefix ${prefix} from URL pathname ${pathname}`)
            }
        }
    }
    return (
        <HashRouter>
            <QueryParamProvider ReactRouterRoute={RouteAdapter}>
                <Routes>
                    <Route path="/*" element={<S3Tree bucket={bucket} prefix={prefix} />} />
                </Routes>
            </QueryParamProvider>
        </HashRouter>
    )
}

$(document).ready(function () {
    ReactDOM.render(<Router/>, document.getElementById('root'));
});
