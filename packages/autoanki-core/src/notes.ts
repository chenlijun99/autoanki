/**
 * @file This file contains:
 *
 * * Autoanki core "note" data types and Zod schemas to verify them.
 *     * The "note" data types mostly (if not exactly) match those defined in
 *     `@autoanki/anki-connect`. The Zod schemas have been defined in this
 *     package rather than in the `@autoanki/anki-connect` (which effectively
 *     causes some degree of repetion in data type definition) because
 *     the Zod schemas are used only internally by this package.
 * * Core function that runs the configured pipelines to extract Anki notes
 *   from inputs.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { ReadonlyDeep } from 'type-fest';

import type { NoteTypes, MediaTypes } from '@autoanki/anki-connect';

import { Config } from './config.js';
import { AutoankiMediaFile, autoankiMediaFileSchema } from './media.js';
import { SourcePlugin, TransformerPlugin, getPluginName } from './plugin.js';
import { loadPlugin } from './plugin-loader.js';
import type { Equals, AssertTrue } from './utils/type.js';
import { tagSchema } from './utils.js';

const ankiConnectMediaFileSchema = z
  .object({
    filename: z.string(),
    skipHash: z.string().optional(),
    deleteExisting: z.boolean().optional(),
    data: z.string().optional(),
    path: z.string().optional(),
    url: z.string().optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (!data.url && !data.data && !data.path) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url', 'data', 'path'],
        message: 'At least one among `url`, `data` and `path` must be provided',
      });
    }
  });

type AnkiConnectMediaFile = z.infer<typeof ankiConnectMediaFileSchema>;
type MediaFileSchemaMatchesInterface = AssertTrue<
  Equals<MediaTypes.MediaFile, AnkiConnectMediaFile>
>;

const ankiConnectNoteMediaFileSchema = z.intersection(
  z
    .object({
      fields: z.string().array(),
    })
    .strict(),
  ankiConnectMediaFileSchema
);

type AnkiConnectNoteMediaFile = z.infer<typeof ankiConnectNoteMediaFileSchema>;
type NoteMediaFileSchemaMatchesInterface = AssertTrue<
  Equals<NoteTypes.NoteMediaFile, AnkiConnectNoteMediaFile>
>;

const newNoteMediasSchema = z.union([
  ankiConnectNoteMediaFileSchema,
  ankiConnectNoteMediaFileSchema.array().optional(),
]);
const ankiConnectNewNoteSchema = z
  .object({
    deckName: z.string(),
    modelName: z.string(),
    fields: z.record(z.string().min(1), z.string()),
    options: z
      .object({
        allowDuplicate: z.boolean(),
        duplicateScope: z
          .union([z.literal('deckName'), z.unknown()])
          .optional(),
        duplicateScopeOptions: z
          .object({
            deckName: z.string().optional().nullable(),
            checkChildren: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    tags: tagSchema.array(),
    audio: newNoteMediasSchema,
    video: newNoteMediasSchema,
    picture: newNoteMediasSchema,
  })
  .strict();

type AnkiConnectNewNote = z.infer<typeof ankiConnectNewNoteSchema>;
type NewNoteSchemaMatchesInterface = AssertTrue<
  Equals<NoteTypes.NewNote, AnkiConnectNewNote>
>;

const parsedNoteSchema = ankiConnectNewNoteSchema
  .omit({
    audio: true,
    picture: true,
    video: true,
  })
  .extend({
    mediaFiles: z.array(autoankiMediaFileSchema).optional(),
    styleFiles: z.array(autoankiMediaFileSchema).optional(),
    scriptFiles: z.array(autoankiMediaFileSchema).optional(),
    /*
     * Note that, at the date of writing (2022-10-29), this id is different from
     * `@autoanki/anki-connect`'s id. This id is an UUID (formatted as string),
     * while the `id` field used in the Note data type in `@autoanki/anki-connect`
     * actions is a number and is a id provided by the local Anki's database,
     * which cannot be used to uniquely identify a note across different Anki
     * profiles.
     *
     * But anyway, source plugin don't need to care about the exact semantic of
     * the id. They just need to be able to parse and write back an id (of type
     * string), no matter its semantics.
     */
    id: z.string().uuid().optional(),
    deleted: z.boolean().optional(),
    /*
     * In @autoanki/core, make the `deck` field optional so that plugins
     * can produce notes with no deck.
     */
    deckName: z.string().optional(),
    /*
     * In @autoanki/core, make the `tags` field optional so that plugins
     * can produce notes with no tags.
     */
    tags: tagSchema.array().optional(),
  });

/**
 * Type of a note parsed from an input
 */
export type ParsedNote = z.infer<typeof parsedNoteSchema>;

interface AutoankiMediaFileFromPlugin {
  fromPlugin: SourcePlugin | TransformerPlugin;
  /**
   * Medias returned from plugins are immutable.
   * As long as two media files are referentially equal, we consider
   * them to have the same content.
   */
  media: Readonly<AutoankiMediaFile>;
}

/**
 * Core Anki note type used throughout the Autoanki system
 */
export interface AutoankiNote
  extends Omit<AnkiConnectNewNote, 'id' | 'audio' | 'video' | 'picture'> {
  mediaFiles: Readonly<AutoankiMediaFileFromPlugin>[];
  styleFiles: Readonly<AutoankiMediaFileFromPlugin>[];
  scriptFiles: Readonly<AutoankiMediaFileFromPlugin>[];
  /**
   * All the data relevant to the Autoanki system are contained
   * in the `autoanki` property.
   * Makes things easier during development.
   */
  autoanki: {
    /**
     * UUID of the Anki note.
     *
     * If absent, it means that the source plugin didn't find an id from the
     * input. In most cases, this means that the user wrote a new Anki note, which has
     * been assigned an id yet.
     */
    uuid?: string;
    /**
     * Whether the note has been deleted from Anki
     */
    deleted?: boolean;
    /**
     * Content of the note fields as they were parsed from the note source,
     * before any transformation
     */
    sourceContentFields: ParsedNote['fields'];
    /**
     * Always present metadata
     */
    metadata: ReadonlyDeep<{
      /**
       * The parsed note that is the source of this Autoanki note
       */
      parsedNote: ParsedNote;
      /**
       * The note source from which this Autoanki note was extracted
       */
      input: NoteInput;
      /**
       * The source plugin that extracted this Autoanki note from the note
       * source
       */
      sourcePlugin: SourcePlugin;
      /**
       * Ordered list of transformer plugins applicable to this Autoanki note
       */
      transformerPlugins: TransformerPlugin[];
    }>;
    /**
     * Every plugin can add arbitrary metadata to a note that it parsed or it
     * has transformed.
     *
     * Plugins may also read the metadata from other plugins. It allows some
     * sort of one-way communication between plugins, at the cost of tight
     * coupling among plugins.
     */
    pluginMetadata: ReadonlyDeep<Record<string, unknown>>;
  };
}

/**
 * All the notes created with Autoanki will have this tag
 */
export const AUTOANKI_NOTES_DEFAULT_TAG = 'autoanki' as const;

function convertMedia(
  media: AutoankiMediaFile,
  plugin: AutoankiMediaFileFromPlugin['fromPlugin']
): AutoankiMediaFileFromPlugin {
  return Object.freeze({
    fromPlugin: plugin,
    media: Object.freeze(media),
  });
}

function parsedNoteToAutoankiNote(
  note: ParsedNote,
  sourcePluginParsingMetadata: unknown,
  sourcePlugin: SourcePlugin,
  transformerPlugins: TransformerPlugin[],
  input: NoteInput,
  config: Config
): AutoankiNote {
  const {
    id,
    deleted,
    mediaFiles,
    styleFiles,
    scriptFiles,
    ...presentAlsoInAutoankiNote
  } = note;

  const tags: Set<string> = new Set(note.tags);
  tags.add(AUTOANKI_NOTES_DEFAULT_TAG);
  for (const tag of config.tags ?? []) {
    tags.add(tag);
  }

  const wrap = (media: AutoankiMediaFile) => {
    return convertMedia(media, sourcePlugin);
  };

  const coreAnkiNote: AutoankiNote = {
    ...presentAlsoInAutoankiNote,
    mediaFiles: mediaFiles ? mediaFiles.map((media) => wrap(media)) : [],
    styleFiles: styleFiles ? styleFiles.map((media) => wrap(media)) : [],
    scriptFiles: scriptFiles ? scriptFiles.map((media) => wrap(media)) : [],
    deckName: note.deckName ?? config.defaultDeck ?? 'Default',
    tags: Array.from(tags),
    autoanki: {
      uuid: id,
      deleted: deleted,
      sourceContentFields: { ...note.fields },
      metadata: {
        parsedNote: note,
        input,
        sourcePlugin,
        transformerPlugins,
      },
      pluginMetadata: {
        [getPluginName(sourcePlugin)]: sourcePluginParsingMetadata,
      },
    },
  };
  Object.freeze(coreAnkiNote.autoanki.metadata);
  return coreAnkiNote;
}

function autoankiNoteToParsedNote(note: AutoankiNote): ParsedNote {
  // Include the default tag only if the source already includes it
  let tags: ParsedNote['tags'] =
    note.autoanki.metadata.parsedNote.tags?.includes(
      AUTOANKI_NOTES_DEFAULT_TAG
    ) === true
      ? note.tags
      : note.tags.filter((tag) => tag !== AUTOANKI_NOTES_DEFAULT_TAG);
  if (tags?.length === 0) {
    tags = undefined;
  }

  return {
    id: note.autoanki.uuid,
    deleted: note.autoanki.deleted,
    tags,
    modelName: note.modelName,
    deckName: note.deckName,
    fields: { ...note.autoanki.sourceContentFields },
    options: note.options,
  };
}

/**
 * Some string that can represent the input resource. E.g. an URI, an URL,
 * a file system path, etc.
 */
type NoteInputKey = string;

/**
 * This data type represents some source from which Autoanki notes can
 * be extracted.
 */
export interface NoteInput {
  key: NoteInputKey;
  /**
   * The input's content
   */
  content: ArrayBufferLike;
}

/**
 * Array of note inputs
 */
export type NoteInputs = NoteInput[];

/**
 * Sources from which Autoanki notes can be extracted.
 * They are lazy-loaded only when necessary.
 */
export interface LazyNoteInputs {
  keys: NoteInputKey[];
  /**
   * The input's content loader (e.g. file system access, network request, etc.)
   */
  contentLoader: (key: NoteInputKey) => Promise<ArrayBufferLike>;
}

function isLazyNoteInputs(
  inputs: NoteInputs | LazyNoteInputs
): inputs is LazyNoteInputs {
  return !Array.isArray(inputs);
}

/**
 * Run the transformation pipeline on the given note, to get the final content
 * of the Anki note.
 *
 * As long as the transformers are idempotent, this function is idempotent.
 */
export async function transformAutoankiNote(
  note: AutoankiNote
): Promise<AutoankiNote> {
  note.fields = { ...note.autoanki.sourceContentFields };
  note.mediaFiles = [];
  note.styleFiles = [];
  note.scriptFiles = [];
  let currentNote = note;
  for (const plugin of note.autoanki.metadata.transformerPlugins) {
    const { transformedNote, metadata, scriptFiles, styleFiles, mediaFiles } =
      await plugin.transform(currentNote);
    currentNote = transformedNote;
    // add new metadata, but ensure that it is indeed readonly
    Object.defineProperty(
      currentNote.autoanki.pluginMetadata,
      getPluginName(plugin),
      {
        enumerable: true,
        value: metadata,
      }
    );
    for (const media of scriptFiles ?? []) {
      currentNote.scriptFiles.push(convertMedia(media, plugin));
    }
    for (const media of styleFiles ?? []) {
      currentNote.styleFiles.push(convertMedia(media, plugin));
    }
    for (const media of mediaFiles ?? []) {
      currentNote.mediaFiles.push(convertMedia(media, plugin));
    }
  }
  return currentNote;
}

/**
 * Extract Anki notes from the inputs using the configured pipeline.
 *
 * @param config the plugins configuration
 * @param inputs the set of inputs from which Anki notes will be extracted
 */
export async function extractAutoankiNotes(
  config: Config,
  inputs: NoteInputs | LazyNoteInputs
): Promise<AutoankiNote[]> {
  type LoadedNoteInputs = Record<NoteInputKey, NoteInput>;
  const loadedNoteInputs: LoadedNoteInputs = isLazyNoteInputs(inputs)
    ? {}
    : inputs.reduce((obj, input) => {
        obj[input.key] = input;
        return obj;
      }, {} as LoadedNoteInputs);
  const noteInputKeys = isLazyNoteInputs(inputs)
    ? inputs.keys
    : inputs.map((input) => input.key);

  const pipeline = config.pipeline;
  const processableInputKeys: NoteInputKey[] = noteInputKeys;
  if (processableInputKeys.length === 0) {
    return [];
  }

  if (isLazyNoteInputs(inputs)) {
    await Promise.all(
      processableInputKeys
        .filter((inputKey) => !loadedNoteInputs[inputKey])
        .map(async (inputKey) => {
          /*
           * Create immediately this item, so that any other concurrent
           * code that is executing this same piece of code knows that this
           * input is being loaded that doesn't try to re-load it again.
           *
           * If we're willing to sacrifice type correctness, we could also
           * not create the throw-away `ArrayBuffer(1)`.
           */
          loadedNoteInputs[inputKey] = {
            key: inputKey,
            content: new ArrayBuffer(1),
          };
          loadedNoteInputs[inputKey].content = await inputs.contentLoader(
            inputKey
          );
        })
    );
  }

  const processableInput = processableInputKeys.map(
    (inputKey) => loadedNoteInputs[inputKey]
  );

  const sourcePlugin = await loadPlugin(pipeline.source, 'source');
  let transformerPlugins =
    pipeline.transformers !== undefined
      ? await Promise.all(
          pipeline.transformers.map((transformer) =>
            loadPlugin(transformer, 'transformer')
          )
        )
      : [];

  const notesPerInput = await Promise.all(
    processableInput.map(async (input) => {
      const outputs = await sourcePlugin.parseFromInput!(
        input.key,
        input.content
      );

      /*
       * Not all the plugins are under our control.
       * In principle, we should treat plugin outputs are inputs from
       * the external world, and thus we need to validate them.
       */
      for (const output of outputs) {
        output.note = parsedNoteSchema.parse(output.note);
      }

      return Promise.all(
        outputs.map(async (output) => {
          const note = parsedNoteToAutoankiNote(
            output.note,
            output.metadata,
            sourcePlugin,
            transformerPlugins,
            input,
            config
          );
          return transformAutoankiNote(note);
        })
      );
    })
  );
  return notesPerInput.flat();
}

/**
 * Assign ids to new Anki notes
 */
export async function assignIdsToAutoankiNotes(
  notes: AutoankiNote[]
): Promise<AutoankiNote[]> {
  return notes.map((note) => {
    note.autoanki.uuid = uuidv4();
    return note;
  });
}

export function groupAutoankiNotesBySourcePluginAndInput<T>(
  items: T[],
  getAutoankiNote?: (item: T) => AutoankiNote
): Map<SourcePlugin, Map<NoteInput, T[]>> {
  let groupedBySourcePluginAndInput: Map<
    AutoankiNote['autoanki']['metadata']['sourcePlugin'],
    Map<AutoankiNote['autoanki']['metadata']['input'], T[]>
  > = new Map();

  for (const item of items) {
    const note = getAutoankiNote
      ? getAutoankiNote(item)
      : (item as unknown as AutoankiNote);
    if (
      !groupedBySourcePluginAndInput.has(note.autoanki.metadata.sourcePlugin)
    ) {
      groupedBySourcePluginAndInput.set(
        note.autoanki.metadata.sourcePlugin,
        new Map()
      );
    }
    if (
      !groupedBySourcePluginAndInput
        .get(note.autoanki.metadata.sourcePlugin)!
        .has(note.autoanki.metadata.input)
    ) {
      groupedBySourcePluginAndInput
        .get(note.autoanki.metadata.sourcePlugin)!
        .set(note.autoanki.metadata.input, []);
    }
    groupedBySourcePluginAndInput
      .get(note.autoanki.metadata.sourcePlugin)!
      .get(note.autoanki.metadata.input)!
      .push(item);
  }

  return groupedBySourcePluginAndInput;
}

/**
 * Write back updated Anki notes to their input
 */
export async function writeBackAutoankiNoteUpdates(
  notes: AutoankiNote[]
): Promise<NoteInput[]> {
  let groupedBySourcePluginAndInput =
    groupAutoankiNotesBySourcePluginAndInput(notes);

  let updatedContents: Record<NoteInput['key'], ArrayBufferLike[]> = {};

  for (const [sourcePlugin, groupedByInputs] of groupedBySourcePluginAndInput) {
    for (const [input, ankiNotes] of groupedByInputs) {
      const newContent = await sourcePlugin.writeBackToInput(
        input.key,
        input.content,
        ankiNotes.map((note) => {
          return {
            note: autoankiNoteToParsedNote(note),
            metadata:
              note.autoanki.pluginMetadata[
                getPluginName(note.autoanki.metadata.sourcePlugin)
              ],
          };
        })
      );
      if (!updatedContents[input.key]) {
        updatedContents[input.key] = [];
      }
      updatedContents[input.key].push(newContent);
    }
  }

  return Object.entries(updatedContents).map(([key, contents]) => {
    if (contents.length > 1) {
      throw new Error('Conflict updates');
    }
    return {
      key,
      content: contents[0],
    };
  });
}
