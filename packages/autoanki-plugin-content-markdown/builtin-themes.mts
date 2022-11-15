import { fileURLToPath } from 'node:url';
import { readdirSync, promises } from 'node:fs';
import path from 'node:path';

import sass from 'sass';
const { compileString } = sass;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

function getThemeJsModuleString(themeCss: string): string {
  return `export const themeCssBase64 = \`
${toBase64(themeCss)}
\`;
`;
}

async function buildAndSaveTheme(
  cssPath: string,
  themeNameWithPathSeparator: string,
  assetsBasePath: string
): Promise<unknown> {
  const lightModeOutputPath = path.join(
    assetsBasePath,
    `${themeNameWithPathSeparator}-autoanki-light.js`
  );
  const darkModeOutputPath = path.join(
    assetsBasePath,
    `${themeNameWithPathSeparator}-autoanki-dark.js`
  );

  const cssContent = (await promises.readFile(cssPath)).toString();

  return Promise.all([
    promises.writeFile(lightModeOutputPath, getThemeJsModuleString(cssContent)),
    (async () => {
      const nightThemeScss = `.nightMode{ ${cssContent} }`;
      const nightThemeCss = compileString(nightThemeScss, {
        style: 'compressed',
      });
      return promises.writeFile(
        darkModeOutputPath,
        getThemeJsModuleString(nightThemeCss.css)
      );
    })(),
  ]);
}

const cssCommonPathPrefix = path.join(
  __dirname,
  './node_modules/highlight.js/styles/'
);
const cssPaths = [
  path.join(__dirname, './node_modules/highlight.js/styles/'),
  path.join(__dirname, './node_modules/highlight.js/styles/base16/'),
];

const cssFiles = cssPaths.flatMap((cssFolder) => {
  return readdirSync(cssFolder)
    .filter((file) => file.endsWith('.css'))
    .map((file) => path.join(cssFolder, file));
});

const themeNamesWithPathSeparator = cssFiles.map((css) => {
  const relativePath = path.relative(cssCommonPathPrefix, css);
  const withoutExtension = relativePath.slice(
    0,
    -path.extname(relativePath).length
  );
  return withoutExtension;
});

export async function buildAndWriteBuiltinThemes(assetsBasePath: string) {
  await Promise.all(
    cssPaths.map((cssPath) => {
      const relative = path.relative(cssCommonPathPrefix, cssPath);
      const outputDir = path.join(assetsBasePath, relative);

      return promises.mkdir(outputDir, {
        recursive: true,
      });
    })
  );

  return Promise.all(
    cssFiles.map((css, i) => {
      return buildAndSaveTheme(
        css,
        themeNamesWithPathSeparator[i],
        assetsBasePath
      );
    })
  );
}

export async function writeBuiltinThemesModule(
  tsFileRelativeCWDPath: string
): Promise<void> {
  await promises.writeFile(
    tsFileRelativeCWDPath,
    `
export interface ThemeModule {
  themeCssBase64: string;
}

export const builtinThemes = ${JSON.stringify(
      themeNamesWithPathSeparator
    )} as const;
`
  );
}
