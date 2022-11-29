import assert from 'node:assert';

import { fc } from '@fast-check/jest';
import { z } from 'zod';
import { ZodFastCheck } from 'zod-fast-check';
import { isEqual } from 'lodash-es';

import { configSchema as coreConfigSchema } from '@autoanki/core';
import { configSchema as syncConfigSchema } from '@autoanki/sync';

import {
  ConfigManager,
  NoteInputConfig,
  NoteInputsConfig,
  Config,
} from './index.js';

function escapeGlob(glob: string): string {
  return glob.replace(/[!()*?[\\\]{}]/g, (value) => `\\${value}`);
}

type DecomposedNoteInputConfig = {
  original: NoteInputConfig;
  decomposed: Partial<NoteInputConfig>[];
};

function configBuilder(
  noteInputKeyThatShouldBeMatched: string,
  matchedConfig: DecomposedNoteInputConfig,
  nonMatched: [string | null, NoteInputConfig][]
): Config {
  const noteInputsConfig: Config['noteInputsConfig'] = nonMatched.map(
    ([nonMatchedFile, nonMatchedConfig]) => {
      if (nonMatchedFile) {
        fc.pre(!nonMatchedFile.includes(noteInputKeyThatShouldBeMatched));
      }
      return {
        inputs: nonMatchedFile ? [escapeGlob(nonMatchedFile)] : [],
        ignores:
          nonMatchedFile === null
            ? [escapeGlob(noteInputKeyThatShouldBeMatched)]
            : undefined,
        ...nonMatchedConfig,
      } as NoteInputsConfig;
    }
  );
  function* insertionIndicies() {
    let start = 0;
    let end = 0;
    for (let i = 0, length = matchedConfig.decomposed.length; i < length; ++i) {
      yield [i, start];
      start += 2;

      ++i;
      if (i < length) {
        yield [i, noteInputsConfig.length + end];
        end -= 2;
      }
    }
  }

  assert(matchedConfig.decomposed.length > 0);
  for (const [index, insertionIndex] of insertionIndicies()) {
    noteInputsConfig.splice(insertionIndex, 0, {
      ...matchedConfig.decomposed[index],
      inputs: [escapeGlob(noteInputKeyThatShouldBeMatched)],
      ignores: [],
    });
  }
  return {
    noteInputsConfig: noteInputsConfig,
  };
}

describe('ConfigManager', () => {
  const autoankiCoreConfigArb = ZodFastCheck().inputOf(
    coreConfigSchema.extend({
      /*
       * May contain functions, which don't work with Jest's `expect.toEqual`
       */
      pipeline: coreConfigSchema.shape.pipeline,
    })
  ) as fc.Arbitrary<z.infer<typeof coreConfigSchema>>;
  const autoankiSyncConfigArb: fc.Arbitrary<z.infer<typeof syncConfigSchema>> =
    ZodFastCheck().inputOf(
      syncConfigSchema.omit({
        /*
         * Its refinement is too selective.
         * Shouldn't impact the logic that we're testing
         */
        manualActionDefaultChoices: true,
      })
    );

  const noteConfigArb = fc.record<NoteInputConfig>({
    '@autoanki/core': autoankiCoreConfigArb,
    '@autoanki/sync': autoankiSyncConfigArb,
  });

  const decomposedNoteConfigArb: fc.Arbitrary<DecomposedNoteInputConfig> = fc
    .tuple(noteConfigArb)
    .chain((args) => {
      const config: NoteInputConfig = args[0];
      return fc
        .array(
          fc.uniqueArray(
            fc.constantFrom(...Object.keys(config)) as fc.Arbitrary<
              keyof NoteInputConfig
            >
          ),
          {
            maxLength: 5,
          }
        )
        .map((keysPerParital) => {
          const metKeys = new Set<string>();
          const decomposed = keysPerParital.map((partialKeys) => {
            const partialConfig: Partial<NoteInputsConfig> = {};
            for (const key of partialKeys) {
              metKeys.add(key);
              // @ts-ignore
              partialConfig[key] = config[key];
            }
            return partialConfig;
          });
          return {
            original: config,
            /*
             * Return original config if using the decomposition the original
             * config cannot be re-derived.
             */
            decomposed:
              metKeys.size === Object.keys(config).length
                ? decomposed
                : [config],
          } as DecomposedNoteInputConfig;
        });
    });

  const noteInputKeyArb = fc.webPath({ size: '+1' });

  it('must return the expected file config', () => {
    type NonMatchedConfig = [string | null, NoteInputConfig];
    const nonMatchedArb: fc.Arbitrary<NonMatchedConfig[]> = fc.array(
      fc.tuple(fc.option(noteInputKeyArb), noteConfigArb),
      {
        maxLength: 10,
      }
    );

    type UnwrapArb<Arb> = Arb extends fc.Arbitrary<infer U> ? U : never;

    const args = [
      noteInputKeyArb,
      decomposedNoteConfigArb,
      nonMatchedArb,
    ] as const;

    const examples: [
      UnwrapArb<typeof args[0]>,
      UnwrapArb<typeof args[1]>,
      UnwrapArb<typeof args[2]>
    ][] = [
      [
        /*
         * In this example the note source input has some glob-reserved
         * special characters.
         * This actually tests that the test properly escapes the glob.
         */
        '/\\(',
        {
          original: {
            '@autoanki/core': {
              pipeline: { source: ' ' },
            },
            '@autoanki/sync': {},
          },
          decomposed: [
            {
              '@autoanki/core': {
                pipeline: { source: ' ' },
              },
              '@autoanki/sync': {},
            },
          ],
        } as DecomposedNoteInputConfig,
        [],
      ],
    ];

    fc.assert(
      fc.property(...args, (noteInput, noteConfig, nonMatched) => {
        fc.pre(noteInput.length > 0);
        const builtConfig = configBuilder(noteInput, noteConfig, nonMatched);
        const manager = new ConfigManager(builtConfig);

        const config = manager.getFileConfig(noteInput);
        expect(config).toEqual(noteConfig.original);
      }),
      { examples }
    );
  });

  it('ensures that deep equality <=> shallow equality for any file config it returns', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(noteInputKeyArb, { maxLength: 3 }),
        decomposedNoteConfigArb,
        (noteInputKeys, noteConfig) => {
          const configPerNote = noteInputKeys.map((noteInputKey) =>
            configBuilder(noteInputKey, noteConfig, [])
          );
          const combinedConfigs: Config = configPerNote.reduce(
            (combined, current) => {
              combined.noteInputsConfig = combined.noteInputsConfig.concat(
                current.noteInputsConfig
              );
              return combined;
            },
            { noteInputsConfig: [] } as Config
          );

          const manager = new ConfigManager(combinedConfigs);

          const noteConfigs: NoteInputConfig[] = noteInputKeys.map(
            (noteInputKey) => {
              const config = manager.getFileConfig(noteInputKey);
              expect(config).toEqual(noteConfig.original);
              return config;
            }
          );

          for (const [i, config] of noteConfigs.entries()) {
            if (i > 0) {
              expect(config).toBe(noteConfigs[0]);
            }
          }
        }
      )
    );
  });

  it('ensures that deep equality <=> shallow equality for any property of the file configs it returns', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(noteInputKeyArb, { minLength: 2, maxLength: 2 }),
        fc.uniqueArray(decomposedNoteConfigArb, { minLength: 2, maxLength: 2 }),
        autoankiSyncConfigArb,
        (noteInputKeys, noteConfigs, commonSyncConfig) => {
          assert(noteConfigs.length === 2);
          fc.pre(!isEqual(noteConfigs[0], noteConfigs[1]));

          const configPerNote = noteConfigs.map((config, i) => {
            const syncConfig = { ...commonSyncConfig };
            config.original['@autoanki/sync'] = syncConfig;
            for (const partial of config.decomposed) {
              partial['@autoanki/sync'] = syncConfig;
            }
            return configBuilder(noteInputKeys[i], config, []);
          });
          const combinedConfigs: Config = configPerNote.reduce(
            (combined, current) => {
              combined.noteInputsConfig = combined.noteInputsConfig.concat(
                current.noteInputsConfig
              );
              return combined;
            },
            { noteInputsConfig: [] } as Config
          );

          const manager = new ConfigManager(combinedConfigs);

          const resultNoteConfigs: NoteInputConfig[] = noteInputKeys.map(
            (noteInputKey, i) => {
              const config = manager.getFileConfig(noteInputKey);
              expect(config).toEqual(noteConfigs[i].original);
              return config;
            }
          );

          for (const [i, config] of resultNoteConfigs.entries()) {
            for (const [j, otherConfig] of resultNoteConfigs.entries()) {
              if (i !== j) {
                expect(config).not.toEqual(otherConfig);
                expect(config['@autoanki/sync']).toEqual(
                  otherConfig['@autoanki/sync']
                );
                expect(config['@autoanki/sync']).toBe(
                  otherConfig['@autoanki/sync']
                );
              }
            }
          }
        }
      )
    );
  });

  it('returns undefined if a complete and valid configuration cannot be constructed for a note input', () => {
    interface Test {
      config: Config;
      valid: boolean;
      input: string;
    }
    const examples: Test[] = [
      {
        valid: true,
        input: 'a.md',
        config: {
          noteInputsConfig: [
            {
              inputs: ['*'],
              '@autoanki/core': {
                pipeline: {
                  source: 'plugin',
                },
              },
            },
          ],
        },
      },
      {
        /*
         * Only @autoanki/sync is not enough
         */
        valid: false,
        input: 'a.md',
        config: {
          noteInputsConfig: [
            {
              inputs: ['*'],
              '@autoanki/sync': {},
            },
          ],
        },
      },
    ];

    for (const test of examples) {
      const manager = new ConfigManager(test.config);
      const config = manager.getFileConfig(test.input);
      if (test.valid) {
        expect(config).not.toBeUndefined();
      } else {
        expect(config).toBeUndefined();
      }
    }
  });
});
