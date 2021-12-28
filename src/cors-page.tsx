import {CodeBlock, Container} from "./style";
import {issuesUrl} from "./github-link";
import React from "react";

export const CorsPage = (
    { bucket, endpoint, isS3Domain, Credentials, }: {
        bucket: string
        endpoint: string
        isS3Domain: boolean
        Credentials: () => JSX.Element
    }
) => {
    const s3Url = `${endpoint}/index.html`
    return (
        <Container>
            <h2>Network error</h2>
            <p>Seems like a CORS problem (check the Developer Tools for more details). You may need to either:</p>
            <ul>
                <li>enable CORS on the bucket (see below), or</li>
                <li>specify the bucket's region, or an access/secret key pair</li>
            </ul>
            <p>If the info below doesn't help, feel free to <a href={issuesUrl}>file an issue</a> with info about
                what you're seeing (output from JavaScript Console will be useful to include).</p>
            <h3 id={"credentials"}>Authentication</h3>
            {Credentials()}
            <h3 id={"CORS"}>Enable CORS on bucket</h3>
            <p>Bash commands for enabling:</p>
            <CodeBlock>{`cat >cors.json <<EOF
{
    "CORSRules": [{
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["${window.location.host}"],
        "ExposeHeaders": ["Accept-Ranges", "Content-Encoding"]
    }]
}
EOF
aws s3api put-bucket-cors --bucket "${bucket}" --cors-configuration "$(cat cors.json)"
`}
            </CodeBlock>
            {
                isS3Domain ? null : <>
                    <h4>Install <code>index.html</code> in bucket</h4>
                    <p>You can also install this <code>index.html</code> in the bucket <code>{bucket}</code>, and visit it directly:</p>
                    <CodeBlock>{`aws s3 cp s3://s3idx/index.html s3://${bucket}/index.html --content-type="text/html; charset=utf-8" --acl public-read`}</CodeBlock>
                    <p>then visit <a href={s3Url}>{s3Url}</a></p>
                </>
            }
        </Container>
    )
}
