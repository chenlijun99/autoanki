import { readdirSync, promises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sass from 'sass';
const { compileString } = sass;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assetsPath = path.join(__dirname, 'assets');

function toBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

function getThemeJsModuleString(themeCss: string): string {
  return `export const themeCssBase64 = \`
${toBase64(themeCss)}
\`;
`;
}

async function buildAndSaveTheme(
  cssPath: string,
  themeNameWithPathSeparator: string
): Promise<unknown> {
  const lightModeOutputPath = path.join(
    assetsPath,
    `${themeNameWithPathSeparator}-autoanki-light.js`
  );
  const darkModeOutputPath = path.join(
    assetsPath,
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

export async function buildAndWriteBuiltinThemes() {
  await Promise.all(
    cssPaths.map((cssPath) => {
      const relative = path.relative(cssCommonPathPrefix, cssPath);
      const outputDir = path.join(assetsPath, relative);

      return promises.mkdir(outputDir, {
        recursive: true,
      });
    })
  );

  return Promise.all(
    cssFiles.map((css, i) => {
      return buildAndSaveTheme(css, themeNamesWithPathSeparator[i]);
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
