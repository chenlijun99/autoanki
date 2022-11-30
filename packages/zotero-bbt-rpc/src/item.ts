interface AttachementResponse {
  open: string;
  path: string;
  annotations: unknown[];
}

export type MethodToTypeMap = {
  'item.attachments': {
    request: {
      citekey: string;
    };
    response: AttachementResponse[];
  };
};
