export interface AttachementResponse {
  /**
   * Open URL for this attachment
   */
  open: string;
  /**
   * If string, it's the path to the attachment in the local file system.
   * If false, probably it is not an attachment (it could be a note).
   */
  path: string | false;
  /**
   * If the attachment is a PDF, then this field is also present.
   */
  annotations?: unknown[];
}

export type MethodToTypeMap = {
  'item.attachments': {
    request: {
      citekey: string;
    };
    response: AttachementResponse[];
  };
  'item.bibliography': {
    request: {
      citekeys: string[];
      format: {
        id: string;
        quickCopy?: boolean;
        contentType?: 'html' | 'text';
        locale?: string;
      };
    };
    response: string;
  };
};
