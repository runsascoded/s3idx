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
https://ctbk.s3.amazonaws.com/index.html:
![](ctbk.gif)

## Features
- Requests to S3 (`ListObjectsV2`) are cached for a configurable length of time (default: 10hrs)
- "Recurse" checkbox (default: off) toggles fetching bucket/directory contents recursively (vs. just the immediate children of the current directory)
- Changes to above settings (as well as others, e.g. size and datetime formats) are persisted in `localStorage`

## Roadmap / Feature wishlist
TODO: make these GitHub issues

### Caching
- [ ] implement recursive fetch mode (using `Prefix`-less ListObjectsV2)
- [ ] Implement cache in `sql.js`

### Table listing
- [ ] toggle showing/hiding columns
- [ ] sortable columns
- [ ] searchable columns
- [ ] hide pagination controls when < 1 page
- [ ] render uncomputed values as links that trigger computation
- [ ] add toggling for pagination params in URL

### Global Configs
- [ ] initial global configs in `index.html`
  - [ ] cache TTL
  - [ ] recurse by default
  - [ ] page size
  - [ ] show page idx/size in URL query params
  - [ ] authentication keys
- [ ] global configs in "⚙️" tooltip somewhere

### Misc
- [ ] check both `<bucket>.s3.amazonaws.com/…` and `s3.amazonaws.com/<bucket>/…` URL forms
- [ ] audit/reduce bundle size
- [ ] treemap view
- [ ] DEP0005 deprecation warning during `npm run build`
