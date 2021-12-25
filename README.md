# s3idx ![](assets/favicon.ico)
S3 bucket browsing via single `index.html` file

## Usage
Copy `s3://s3idx/index.html` to any public S3 bucket:
```bash
aws s3 cp s3://s3idx/index.html s3://$bucket/ --content-type="text/html; charset=utf-8" --acl public-read
```

Browse `$bucket` interactively:
```bash
open https://$bucket.s3.amazonaws.com/index.html
```

## Example
Here's `index.html` in action in the `ctbk` bucket, [ctbk.s3.amazonaws.com/index.html](https://ctbk.s3.amazonaws.com/index.html):

![](ctbk.gif)

Note:
- paginated results
- caching/pre-fetching for snappy responses
- opt-in recursive fetching
- total sizes / last modified times for directories (only when fully fetched)

## Implementation Notes
- Requests to S3 (`ListObjectsV2`) are cached for a configurable length of time (default: 10hrs)
- "Recurse" checkbox (default: off) toggles fetching bucket/directory contents recursively (vs. just the immediate children of the current directory)
- Changes to above settings (as well as others, e.g. size and datetime formats) are persisted in `localStorage`

## Roadmap / Feature wishlist
TODO: make these GitHub issues

### Caching
- [ ] implement recursive fetch mode (using `Prefix`-less ListObjectsV2)
- [ ] alternative cache in `sql.js`
- [ ] propagate cache evictions up the directory tree
- [ ] display remaining TTL for objects/pages
- [ ] "Clear Cache" button → "🗑" / "♻️"
- [ ] toggle auto-eviction vs. UI warning/highlighting stale info

### Table listing
- [ ] toggle showing/hiding columns
- [ ] render uncomputed values as links that trigger computation
- [ ] sortable columns
- [ ] searchable columns
- [ ] add toggling for pagination params in URL
- [ ] allow switching buckets in non-AWS-hosted mode
- [ ] hide pagination controls when < 1 page
- [ ] single-letter mode for IEC sizes

### Global Configs
- [ ] global configs in "⚙️" tooltip
- [ ] hotkey edu in "⌨️" tooltip
- [ ] configurable region/credentials
- [ ] region/credentials per bucket

### Misc
- [ ] check both `<bucket>.s3.amazonaws.com/…` and `s3.amazonaws.com/<bucket>/…` URL forms
- [ ] audit/reduce bundle size
- [ ] treemap view
- [ ] DEP0005 deprecation warning during `npm run build`
- [ ] better/structured logging
- [ ] create Lambda that compiles `index.html` with various default configs set (or e.g. `sql.js` mode)
