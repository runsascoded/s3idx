import {HashRouter, Route, Routes} from "react-router-dom";
import React from 'react';
import ReactDOM from 'react-dom'

import './bootstrap.min.css';
import $ from 'jquery';
import {S3Tree} from "./s3tree";
import {QueryParamProvider} from "use-query-params";
import {RouteAdapter} from "./route-adapter";
import {parseS3LocationInfo} from "./s3/location";

function Router() {
    console.log("Router rendering")
    const s3LocationInfo = parseS3LocationInfo()
    return (
        <HashRouter>
            <QueryParamProvider ReactRouterRoute={RouteAdapter}>
                <Routes>
                    <Route path="/*" element={<S3Tree s3LocationInfo={s3LocationInfo} />} />
                </Routes>
            </QueryParamProvider>
        </HashRouter>
    )
}

$(document).ready(function () {
    ReactDOM.render(<Router/>, document.getElementById('root'));
});
