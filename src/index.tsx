import {HashRouter, Route, Routes} from "react-router-dom";
import React from 'react';
import ReactDOM from 'react-dom'

import './bootstrap.min.css';
import $ from 'jquery';
import {S3Tree} from "./s3tree";
import {QueryParamProvider} from "use-query-params";
import {RouteAdapter} from "./route-adapter";

function Router() {
    console.log("Router rendering")
    const { hostname, pathname, } = window.location
    const rgx = /((?<bucket>.*)\.)?s3(-website)?(\.(?<region>[^.]+))?\.amazonaws\.com$/
    let endpoint = ''
    const match = hostname.match(rgx)
    let { bucket } = match?.groups || {}
    let pathPrefix
    if (match) {
        if (bucket) {
            pathPrefix = pathname.replace(/\/.*?$/, '')
            console.log(`Parsed bucket ${bucket}, prefix ${pathPrefix} from URL hostname ${hostname}, pathname ${pathname}`)
        } else {
            const rgx = /s3(\.(?<region>[^.]+))?\.amazonaws\.com$/  // TODO: factor with s3tree
            if (hostname.match(rgx)) {
                const pieces = pathname.replace(/^\//, '').split('/')
                bucket = pieces[0]
                if (bucket) {
                    // Redirect URLs of the form `s3.amazonaws.com/<bucket>` to `<bucket>.s3.amazonaws.com`, for
                    // security reasons
                    if (!bucket.includes('.')) {
                        // One exception is buckets that have a dot (`.`) in their name, for which S3's default HTTPS
                        // certificate setup doesn't work correctly at `<bucket>.s3.amazonaws.com`, and so are better
                        // viewed at `s3.amazonaws.com/<bucket>`.
                        const newUrl = `https://${bucket}.s3.amazonaws.com/index.html`
                        console.log(`Redirecting to ${newUrl}`)
                        window.location.assign(newUrl)
                        return null
                    }
                }
            }
        }
    }
    return (
        <HashRouter>
            <QueryParamProvider ReactRouterRoute={RouteAdapter}>
                <Routes>
                    <Route path="/*" element={<S3Tree bucket={bucket} pathPrefix={pathPrefix} endpoint={endpoint} />} />
                </Routes>
            </QueryParamProvider>
        </HashRouter>
    )
}

$(document).ready(function () {
    ReactDOM.render(<Router/>, document.getElementById('root'));
});
