import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GeminiSearchApiCredentials implements ICredentialType {
	name = 'geminiSearchApi';
	displayName = 'Gemini API Credentials';
	documentationUrl = 'https://ai.google.dev/';
	properties: INodeProperties[] = [
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
