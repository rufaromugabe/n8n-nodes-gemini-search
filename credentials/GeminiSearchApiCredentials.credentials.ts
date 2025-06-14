import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GeminiSearchApiCredentials implements ICredentialType {
  name = 'geminiSearchApi';
  displayName = 'Gemini API Credentials';
  documentationUrl = 'https://ai.google.dev/';
  properties: INodeProperties[] = [
     {
      displayName: 'Host',
      name: 'host',
      type: 'string',
      default: 'https://generativelanguage.googleapis.com',
      placeholder: 'https://generativelanguage.googleapis.com',
      required: false,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
  ];
}
