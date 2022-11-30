import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
  AutoankiPluginApi,
  AutoankiScriptMediaFile,
} from '@autoanki/core';

import type { PluginArgs } from './bridge/index.js';

import bundledBridgePluginBase64 from 'bridge/index.bundled.js';
import bundledBridgePluginPdfjsWorkerBase64 from 'bridge/pdf.worker.bundled.js';
import reactPdfTextLayerCssBase64 from 'react-pdf/dist/esm/Page/TextLayer.css';
import reactPdfAnnotationLayerCssBase64 from 'react-pdf/dist/esm/Page/AnnotationLayer.css';

type PluginMediaFiles = {
  media: AutoankiMediaFile[];
  styles: AutoankiMediaFile[];
  scripts: AutoankiMediaFile[];
};

export class PdfContentPlugin implements TransformerPlugin {
  static pluginName = '@autoanki/plugin-content-pdf';

  constructor(private coreApi: AutoankiPluginApi) {}

  private cachedMediaFiles: PluginMediaFiles | undefined;

  private mediaFilesComputingPromise: Promise<PluginMediaFiles> | undefined;

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    const pdfsToRender = note.mediaFiles.filter((file) => {
      return file.filename.endsWith('.pdf') || file.mime === 'application/pdf';
    });

    if (pdfsToRender.length > 0) {
      this.coreApi.logger.log(
        'Found PDF media file in the note. Attaching PDF renderer script'
      );

      if (!this.cachedMediaFiles) {
        if (!this.mediaFilesComputingPromise) {
          this.mediaFilesComputingPromise = Promise.all([
            this.coreApi.media.computeAutoankiMediaFileFromRaw({
              base64Content: reactPdfTextLayerCssBase64,
              filename: 'react-pdf-TextLayer.css',
            }),
            this.coreApi.media.computeAutoankiMediaFileFromRaw({
              base64Content: reactPdfAnnotationLayerCssBase64,
              filename: 'react-pdf-AnnotationLayer.css',
            }),
            this.coreApi.media
              .computeAutoankiMediaFileFromRaw({
                base64Content: bundledBridgePluginPdfjsWorkerBase64,
                filename: 'pdf.worker.js',
              })
              .then(async (pdfWorker) => {
                const bridgePlugin =
                  await this.coreApi.media.computeAutoankiMediaFileFromRaw({
                    base64Content: bundledBridgePluginBase64,
                    filename: 'pdf_render.js',
                  });
                ((bridgePlugin as AutoankiScriptMediaFile)
                  .scriptArgs as PluginArgs) = {
                  pdfFilesToRender: pdfsToRender.map(
                    (pdf) => pdf.metadata.storedFilename
                  ),
                  pdfjsWorkerSrc: pdfWorker.metadata.storedFilename,
                };
                return {
                  scripts: [bridgePlugin],
                  media: [pdfWorker],
                };
              }),
          ] as const).then((medias) => {
            return {
              styles: [medias[0], medias[1]],
              ...medias[2],
            } as PluginMediaFiles;
          });
        }
        this.cachedMediaFiles = await this.mediaFilesComputingPromise;
      }

      return {
        transformedNote: note,
        styleFiles: this.cachedMediaFiles!.styles,
        mediaFiles: this.cachedMediaFiles!.media,
        scriptFiles: this.cachedMediaFiles!.scripts,
      };
    }

    return {
      transformedNote: note,
    };
  }
}

export default {
  transformer: PdfContentPlugin,
} as AutoankiPlugin;
