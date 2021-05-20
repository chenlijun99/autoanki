import { NoteParseConfig } from './internal/parse';

/**
 * Autoanki configuration model
 */
export interface AutoAnkiConfiguration extends NoteParseConfig {
  ankiConnectPort?: number;
}
