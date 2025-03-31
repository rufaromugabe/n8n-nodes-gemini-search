import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeConnection,
} from 'n8n-workflow';
import { geminiRequest } from './GenericFunctions';

export class GeminiSearchTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gemini Search Tool',
		name: 'geminiSearchTool',
		icon: 'file:gemini.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Google Gemini as a search tool',
		defaults: {
			name: 'Gemini Search Tool',
		},
		// @ts-ignore - node-class-description-outputs-wrong
		inputs: [{ type: 'main' }],
		// @ts-ignore - node-class-description-outputs-wrong
		outputs: [{ type: 'main' }],
		usableAsTool: true,
		credentials: [
			{
				name: 'geminiSearchApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				description: 'The search query to execute with Gemini',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Gemini 1.0 Pro',
						value: 'gemini-1.0-pro',
					},
					{
						name: 'Gemini 1.5 Pro',
						value: 'gemini-1.5-pro',
					},
					{
						name: 'Gemini 2.0 Flash',
						value: 'gemini-2.0-flash',
					},
					{
						name: 'Gemini 2.0 Pro',
						value: 'gemini-2.0-pro',
					},
					{
						name: 'Gemini 2.5 Pro',
						value: 'gemini-2.5-pro',
					},
					
				],
				default: 'gemini-2.0-flash',
				description: 'The Gemini model to use',
			},
			{
				displayName: 'Organization Context',
				name: 'organization',
				type: 'string',
				default: '',
				description: 'Optional organization name to use as context for search',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 1,
						},
						default: 0.6,
						description: 'Controls randomness in the response (0-1)',
					},
					{
						displayName: 'Max Output Tokens',
						name: 'maxOutputTokens',
						type: 'number',
						default: 2048,
						description: 'Maximum number of tokens to generate',
					},
					{
						displayName: 'Custom System Instruction',
						name: 'systemInstruction',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'Override the default system instruction',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const query = this.getNodeParameter('query', i) as string;
				const model = this.getNodeParameter('model', i) as string;
				const organization = this.getNodeParameter('organization', i, '') as string;
				const options = this.getNodeParameter('options', i, {}) as {
					temperature?: number;
					maxOutputTokens?: number;
					systemInstruction?: string;
				};

				let systemInstruction = options.systemInstruction || '';
				
				if (organization && !systemInstruction) {
					systemInstruction = `You are an expert in retrieving and providing information strictly within the domain of ${organization} and topics directly related to this organization. When answering queries, provide only the most relevant and natural response without unnecessary related information. Do not list multiple similar names, be strict on names or unrelated details. If a query falls outside this scope, politely inform the user that you are limited to ${organization}-related topics. Your response should answer the question directly without saying 'based on search'.`;
				}

				const requestBody: any = {
					contents: [
						{
							role: 'user',
							parts: [
								{
									text: query,
								},
							],
						},
					],
					generationConfig: {
						temperature: options.temperature || 0.6,
						topP: 1,
						topK: 1,
						maxOutputTokens: options.maxOutputTokens || 2048,
						responseMimeType: 'text/plain',
					},
					tools: [
						{
							googleSearch: {},
						},
					],
				};

				if (systemInstruction) {
					requestBody.systemInstruction = {
						parts: [
							{
								text: systemInstruction,
							},
						],
					};
				}

				const response = await geminiRequest.call(this, model, requestBody);

				returnData.push({
					json: {
						result: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
						query,
						organization,
					},
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
