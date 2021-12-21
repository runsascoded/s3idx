import {HashRouter, Route, Routes} from "react-router-dom";
import React, {useState,} from 'react';
import ReactDOM from 'react-dom'

import $ from 'jquery';
import {S3Tree} from "./s3tree";
import {QueryParamProvider} from "use-query-params";
import {RouteAdapter} from "./route-adapter";

function Router() {
    return (
        <HashRouter>
            <QueryParamProvider ReactRouterRoute={RouteAdapter}>
                <Routes>
                    <Route path="/*" element={<S3Tree />} />
                </Routes>
            </QueryParamProvider>
        </HashRouter>
    )
}

$(document).ready(function () {
    ReactDOM.render(<Router/>, document.getElementById('root'));
});
