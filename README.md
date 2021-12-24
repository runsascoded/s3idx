# s3idx ![](assets/favicon.ico)
S3 bucket browsing via single `index.html` file

## Usage
Copy `s3://s3idx/index.html` to any public S3 bucket:
```bash
aws s3 cp s3://s3idx/index.html s3://$bucket/
```

Browse `$bucket` interactively:
```bash
open https://$bucket.s3.amazonaws.com/index.html
```

## Example
https://ctbk.s3.amazonaws.com/index.html:
![](ctbk.gif)

## Features
- requests to S3 (`ListObjectsV2`) are cached for 24hrs
- "Recurse" checkbox (default unchecked, persisted in `localStorage`) toggles fetching bucket/directory contents recursively

  
## Roadmap / Feature wishlist
TODO: make these GitHub issues

### Caching
- [ ] implement recursive fetch mode (using `Prefix`-less ListObjectsV2)
- [ ] configure TTL interactively
- [ ] display TTL / "fetched at" info
- [ ] Implement cache in `sql.js`

### Table listing
- [ ] column formatters (size, times)
- [ ] toggle showing/hiding columns
- [ ] sortable columns
- [ ] searchable columns

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
- [ ] add attribution / GitHub link
- [ ] audit/reduce bundle size
- [ ] treemap view
