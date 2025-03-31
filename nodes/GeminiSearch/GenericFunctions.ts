import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

export async function geminiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	model: string,
	body: object,
) {
	const credentials = await this.getCredentials('geminiSearchApi');
	
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'No credentials provided!');
	}

	const apiKey = credentials.apiKey;

	const options: OptionsWithUri = {
		method: 'POST',
		uri: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
		qs: {
			key: apiKey,
		},
		headers: {
			'Content-Type': 'application/json',
		},
		body,
		json: true,
	};

	try {
		if (!this.helpers) {
			throw new NodeOperationError(this.getNode(), 'Helpers are not available!');
		}
		const response = await this.helpers.request!(options);
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
