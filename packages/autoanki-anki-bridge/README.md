# @autoanki/anki-bridge

The goal of this package is to dynamically load the JavaScript scripts specified in an Anki card and to manage the lifecycle of said scripts.

What motivates this package is Anki's design choice to not allow `<script>` inside notes. See https://forums.ankiweb.net/t/how-to-add-external-css-in-a-field/17838/9. This is understandable, since apparently the same webview instance is used to render all the notes in a review session and only the HTML of the current note is rendered dynamically (this is what happens in Anki-desktop). This has the implication that if scripts were allowed to be specified in each single Anki notes, then many scripts would be loaded over and over. Furthermore, once a script is loaded, it is loaded, while it would be necessary to have some lifecycle control over those scripts: given a script specified in a card, when the user passes to the next card, the operation of the current script must be aborted and the potential resources it acquired must be freed.

By using @autoanki/anki-bridge, it is enough to put the @autoanki/anki-bridge script in the card templates of the cards for which you want to have this kind of dynamic card-specific script loading mechanism.

Well, actually it is not enough. While @autoanki/anki-bridge was designed to be used with the primary intent of being used by other @autoanki packages (see especially [@autoanki/sync](../autoanki-sync/)), I still tried to keep it a bit more general. Thus, @autoanki/anki-bridge actually just provides a side-effect-less `class AnkiBridge` that requires the library user to pass a script query callback that extract card-specific scripts given the card's DOM. Thus, to use @autoanki/anki-bridge the library user must provide such function and also instantiate `class AnkiBridge` and call its `start()` method, as is done in [@autoanki/sync](../autoanki-sync/src/bridge/index.ts).

## Supported environments

- Anki desktop WebView
- AnkiDroid WebView
