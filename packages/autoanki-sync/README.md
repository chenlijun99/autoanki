# @autoanki/sync

This package can be used to sync the Anki notes obtained from @autoanki/core with an Anki profile using [Anki-connect](https://github.com/FooSoft/anki-connect).

## Features

- Note creation
- Note deletion
- Bidirectional sync (if the source supports single-note granularity):
  - Note fields
  - Note tags
  - Note's deck
- Sync conflict reporting and manual or configurable automatic resolution.

## How it works

## Caveats

### For Anki-Android users

#### HTML corruption

TL;DR; Disable the option `Advanced > Replace new lines with HTML`.

When you edit a note using Anki-Android, Anki-Android automatically converts newlines into `<br/>`, with leads to HTML corruption.

E.g. given the following note field content:

<!-- prettier-ignore-start -->
```html
<p id="my-id"
   class="my-class">
   My content.
</p>
```

If you edit this note field using Anki-Android and insert something like:

```html
<p id="my-id"
   class="my-class">
   My content. Additional content.
</p>
```

When you press confirm, Anki-Android transform the HTML into:

```html
<p id="my-id"<br\> class="my-class"><br\> My content. Additional content.<br\></p>
```

<!-- prettier-ignore-end -->

See https://github.com/ankidroid/Anki-Android/issues/3304.
