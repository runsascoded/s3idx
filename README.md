# s3idx ![](assets/favicon.ico)
Amazon S3 bucket browser in a single `index.html` file

- [Usage](#usage)
- [Example](#examples)
- [Implementation Notes](#implementation)
  - [Caching](#caching)
  - [Configuration](#configuration)
  - [Upload args](#upload-args)
  - [Local development](#local-development)
  - [S3 websites](#s3-websites)
- [Security](#security)
- [Discussion](#discussion)

See [Issues](https://github.com/runsascoded/s3idx/issues) for a roadmap (of sorts).

## Usage <a id="usage"></a>
Copy `s3://s3idx/index.html` to any public S3 bucket:
```bash
bucket=<YOUR BUCKET>
aws s3 cp s3://s3idx/index.html s3://$bucket/ \
  --content-type="text/html; charset=utf-8" \
  --acl public-read
```

Browse `$bucket` interactively:
```bash
open https://$bucket.s3.amazonaws.com/index.html
```

## Example <a id="examples"></a>
Here's `index.html` in action in the `ctbk` bucket, [ctbk.s3.amazonaws.com/index.html](https://ctbk.s3.amazonaws.com/index.html):

![](ctbk.gif)

Note:
- paginated results
- caching/pre-fetching for snappy responses
- opt-in recursive fetching
- total sizes / last modified times for directories (only when fully fetched)

## Implementation Notes <a id="implementation"></a>

### Caching <a id="caching"></a>
- Requests to S3 (`ListObjectsV2`) are cached for a configurable length of time (default: 10hrs)
- "Recurse" checkbox (default: off) toggles fetching bucket/directory contents recursively (vs. just the immediate children of the current directory)
- Changes to above settings (as well as others, e.g. size and datetime formats) are persisted in `localStorage`

### Configuration <a id="configuration"></a>
Various global defaults can be initialized on a per-bucket basis, in the deployed `index.html`, by modifying these values at the top of the file:
```html
<!doctype html><head><title>s3idx</title><script>// ****** s3idx config ******
        // Global default config; uncomment/change lines as desired.
        // Used to seed localStorage values (that then take precedence)
        var S3IDX_CONFIG = {
            // datetimeFmt: "YYYY-MM-DD HH:mm:ss",
            // sizeFmt: "iso",
            // eagerMetadata: false,
            // ttl: "10h",
            // pageSize: 20,
            // s3PageSize: 1000,
            // paginationInfoInURL: true,
            // region: undefined,
        }</script>
…
```

There's probably a better way to do this, but for now, you can just edit `index.html` in a text-editor to uncomment/change the lines you want to change, or do something hacky like:
```bash
aws cp s3://s3idx/index.html ./
perl -pe -i 's/ttl: "10h"/ttl: "1h"/'
aws cp ./index.html s3://s3idx/ \
  --content-type="text/html; charset=utf-8" \
  --acl public-read \
  --cache-control max-age=3600,public
```

### Upload args <a id="upload-args"></a>
The trailing arguments above are necessary to make sure `index.html` is:
- public
- served as UTF-8 (it contains non-ASCII characters and will error otherwise, usually stuck with a page that says "Loadingæ")
- cached at a reasonable frequency
  - 1 hour, in this example
  - this caching is at the HTTP level, orthogonal to the app's `localStorage`-caching of data it receives from S3 (cf. [above](#caching))

### Local development <a id="local-development"></a>
Build in one terminal (and watch for changes):
```bash
npm run dev
```
Serve from `dist/` directory:
```bash
cd dist
http-server
```
Open in browser:
```bash
open http://127.0.0.1:8080/#/$bucket
```

Only buckets that set appropriate CORS headers will be usable; others will show an error page with info/suggestions. See also [discussion of CORS nuances in the Security section](#security).

### S3 websites <a id="s3-websites"></a>
`s3idx` should work from [S3 buckets configured to serve as static sites](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html), e.g. [`http://s3idx.s3-website-us-east-1.amazonaws.com/`](http://s3idx.s3-website-us-east-1.amazonaws.com/). However, I'm not sure there are any advantages to using it that way, as opposed to on the `s3.amazonaws.com` REST API subdomain (where your browser is happy to render it as `text/html`). 

### `Fetcher`
See [`src/fetcher.tsx`](src/s3/fetcher.tsx); each `Fetcher` handles interfacing with a specific "directory" (bucket or "prefix") on S3, fetching pages and maintaining a cache in `localStorage`, computing various summary statistics (number of children, total size, last modified time), and firing callbacks when they change.

It's pretty messy and imperative; lots of room for improvement. In particular, a [SQL.js](https://sql.js.org/#/) backend is appealing, especially for desired table-sorting/searching functionality.

## Security <a id="security"></a>
Below is an informal analysis of s3idx's security assumptions and properties.

### tl;dr
- Use on **public buckets** is believed to be secure / low-risk
- For use on **private buckets**, ["Local development"](#local-development) above shows how to run s3idx locally and point it at any bucket. The app will prompt for authentication or recommend CORS tweaks as necessary.
- Deploying directly to **private buckets** (s3idx's `index.html` still has to be public) is believed to be secure, by me, but I'm not 100% positive, and I am not a security engineer. **DEPLOY TO PRIVATE BUCKETS AT YOUR OWN RISK!**

Other details:
- Access/Secret keys (for using s3idx on private buckets) are submitted by the user and persisted in `localStorage`.
- `index.html` bundles everything it uses, and makes no requests to any external domains (even the favicon, and any images, are either emojis or base64-encoded).

### Public "bucket-subdomain" endpoint <a id="public-buckets"></a>
In the simple case, `index.html` is deployed to a public bucket and accessed at `<bucket>.s3.amazonaws.com/index.html`. It only makes HEAD and GET requests to that domain (when it doesn't have a cached version to fall back on).

### Private buckets
Lots more discussion follows, but ["Local development"](#local-development) above shows how to run s3idx locally and point it at any bucket. The app will prompt for authentication or recommend CORS tweaks as necessary.

s3idx can also be used in private buckets by:
- deploying `index.html` as a publicly readable object (cf. see `--acl public-read` in the installation commands)
- when a person visits it, it will call `listObjectsV2` to read the bucket's contents, receive an HTTP 403 error code (`AccessDenied`), and present the user with a form soliciting a "region" for the bucket as well as an access/secret key pair
- credentials are persisted in `localStorage`, so the user will be able to browse that bucket thereafter.

This increases the vulnerability surface in two important ways:
1. Credentials (access/secret key pair) are stored in `localStorage`.
2. A public `index.html` exists under `<bucket>.s3.amazonaws.com`

To mitigate 1., keys should always be scoped to "read" actions (`Get*`, `List*`) on the current bucket. 2. doesn't directly make any private data public, but it makes it easier for an attacker to access the user's keys (e.g. in the presence of overly permissive CORS headers).  

### CORS <a id="cors"></a>
The most likely security issue I can see results from overly permissive CORS headers on a private bucket with a public s3idx `index.html`.

The degree of over-permissioning required still seems quite high:
- wildcard origin (❗️)
- include credentials (‼️)

Such a CORS configuration on private or sensitive data seems to represent a serious security rsk on its own, independent of s3idx, it's possible I've missed some CORS-based attack vector. Again, **DEPLOY AND USE ON PRIVATE BUCKETS AT YOUR OWN RISK!** and feel free ot [file an issue](https://github.com/runsascoded/s3idx/issues/new) to discuss any of this further.

### "Bucket-path" endpoints
Another security consideration relates to S3 "bucket-path" REST API endpoints of the form `s3.amazonaws.com/<bucket>` (as opposed to the "bucket-subdomain" endpoints s3idx typically uses; example: [`s3.amazonaws.com/s3idx/index.html`](https://s3.amazonaws.com/s3idx/index.html)).

Bucket-path endpoints are generally less secure than bucket-subdomain endpoints. For example, if a user can be tricked into visiting `s3.amazonaws.com/malicious-bucket/index.html`, scripts there can read (and write!) s3idx state about other buckets. For public buckets, this isn't a big problem (afaict!), but with private buckets it's a huge issue.

For this reason, s3idx redirects users to bucket-subdomain endpoints, *except in one case*: when a bucket name contains a `.`, `<bucket>.s3.amazonaws.com` seems to exhibit HTTPS errors, so s3idx allows use of the `s3.amazonaws.com/<bucket>` form (and uses that endpoint for S3 API requests). Here's an example: [`s3.amazonaws.com/ctbk.dev/index.html`](https://s3.amazonaws.com/ctbk.dev/index.html).

So, a private bucket with a dot (`.`) in the name is a bit stuck:
- bucket-subdomain endpoint suffers HTTPS errors
- bucket-path endpoint risks a credential leak

To mitigate this, the access/secret key input fields are disabled on bucket-path endpoints.

## Discussion <a id="discussion"></a>
I've never had a way to see my stuff in S3 that I was satisfied with. If you do, please let me know.

### Prior art <a id="prior-art"></a>
Here are some ways to access S3 I've tried to use for ad hoc browsing:

1. **REST API in browser**: easy way to get lots of XML back ([example](https://ctbk.s3.amazonaws.com/), [screenshot](https://p199.p4.n0.cdn.getcloudapp.com/items/7KuqdvGz/6d5accf5-c2e1-4728-b149-6da2f7fb20de.png?v=5bfdb637af967b5fd02af61df553ca9f)), but not human-friendly.
2. **AWS console S3 page**: has a table with lots of functionality, but hard to get to, a bit clunky, and has lots of admin stuff taking screen real estate.
3. **[AWS CLI](https://aws.amazon.com/cli/)**: often looks like `aws s3 ls --recursive s3://<bucket> > <bucket>.txt` then lots of `sort`/`grep`/`column`/`head`/`tail`.
4. **Jupyter/Boto3/Pandas**: dump boto3 responses into `pd.DataFrame`, powerful setup for downstream viz/analysis, but fairly heavyweight, forces a context switch away from whatever you wanted to see about the S3 bucket, and ultimately I don't have a good "interactive table inside Jupyter" story.
5. Misc desktop FTP clients. I haven't tried this approach in a while, I'm sure there's good functionality out there, but a separate desktop app for this feels awkward.
6. **[s3fs](https://github.com/s3fs-fuse/s3fs-fuse) (+ macOS Finder / Terminal)**: `s3fs` is incredible when it works (which has increased noticeably over the years, IME! 🙏), and [the file/`stat` caching](https://github.com/s3fs-fuse/s3fs-fuse/wiki/Fuse-Over-Amazon#use_cache-default-which-means-disabled) should make it possible for it to be a really snappy way to browse S3. I've observed the cache to not work as well as I'd hoped (very possibly a misconfiguration on my part), and [last time I tried it did not seem install-able on my 2021 Macbook Air](https://github.com/s3fs-fuse/s3fs-fuse/issues/1632#issuecomment-833036048).
7. **"`index.html` browser" from `tripdata` bucket**: Citibike's public data bucket has an "app" that is the inspiration for this repo:*http://tripdata.s3.amazonaws.com/index.html. The license implies [Francesco Pasqualini](https://github.com/francescopasqualini-nf) first made it in 2008! It is small+fast and a really cool idea, but could use some more features (pagination, directory/"prefix"-awareness, etc.). [caussourd/aws-s3-bucket-listing](https://github.com/caussourd/aws-s3-bucket-listing) seems to be the most popular GitHub repo containing it.

With all that said, I'm still missing a fast + featureful way to see stuff in S3. "Mimic the `tripdata/index.html` model, but with some extra features" seems like the quickest way there, so that's what I'm working on here. It's also an exercise in (re)learning frontend/React/Typescript/[Jamstack](https://jamstack.org/why-jamstack/)/etc.
