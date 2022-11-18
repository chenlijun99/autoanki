# @autoanki/plugin-content-local-media-extractor

This plugin can be used to extract media files referenced inside Autoanki notes from the local file system.

## How it works

It parses the content of the note fields and looks for well-known media references:

- For HTML the `<img>`, `<audio>`, `<video>` and `<object>` tags are supported.

Based on the media reference path and on the provided configuration, this plugin tries to find the referenced media file on the local file system. If the media file is found, it is added to the media files of the Autoanki note and the media reference paths in the note field contents are rewritten to become the path that the extract media file will have in the Anki media folder.

## Supported environments

- Node.js. Only Node.js is supported since this plugin deals with the local file system.
