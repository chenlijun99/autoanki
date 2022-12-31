# @autoanki/plugin-content-zotero

Plugin that deals with note content containing "stuff" concerning Zotero.

## Features

- Extracts Zotero attachments when it meets `<object data="<url>"></object>` in the note contents.
  - Via:
    - [JSON-RPC API provided by Zotero Better BibTeX](https://retorque.re/zotero-better-bibtex/exporting/json-rpc/).

## URL formats

- Protocol: `autoanki-zotero://`

### Endpoints

- `pdf/byCiteKey/:citeKey/:index?`
  - `citeKey` (string): attachments will be extracted from the Zotero item with this `citeKey`.
  - `index` (non-negative integer, defaults to `0`): the zero-based index of the attachment, in case the Zotero item referenced by the given `citeKey` contains multiple PDF attachments.
  - E.g. `autoanki-zotero://pdf/byCiteKey/axlerLinearAlgebraDone2015/2`: this URL references the third PDF attachment of the Zotero item that has `axlerLinearAlgebraDone2015` as cite key.

## Supported environments

Node.js. Only Node.js is supported since this plugin has to read attachments files that reside in the local file system.
