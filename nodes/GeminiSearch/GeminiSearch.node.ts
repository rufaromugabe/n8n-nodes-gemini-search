import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { geminiRequest } from './GenericFunctions';
import axios from 'axios';

export class GeminiSearch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gemini Search',
		name: 'geminiSearch',
		icon: 'file:gemini.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Perform searches and generate content using Google Gemini API',
		defaults: {
			name: 'Gemini Search',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'geminiSearchApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Web Search',
						value: 'webSearch',
						description: 'Perform a web search using Gemini',
						action: 'Perform a web search using Gemini',
					},
					{
						name: 'Generate Content',
						value: 'generateContent',
						description: 'Generate content using Gemini',
						action: 'Generate content using Gemini',
					},
				],
				default: 'webSearch',
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'webSearch',
							'generateContent',
						],
					},
				},
				description: 'The prompt to send to Gemini',
			},
			{
				displayName: 'Organization Context',
				name: 'organization',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'webSearch',
						],
					},
				},
				description: 'Optional organization name to use as context for search',
			},
			{
				displayName: 'System Instruction',
				name: 'systemInstruction',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'webSearch',
							'generateContent',
						],
					},
				},
				description: 'Optional system instruction to guide the model behavior',
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
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						description: 'Nucleus sampling parameter',
					},
					{
						displayName: 'Top K',
						name: 'topK',
						type: 'number',
						default: 1,
						description: 'Top K sampling parameter',
					},
					{
						displayName: 'Extract Source URL',
						name: 'extractSourceUrl',
						type: 'boolean',
						default: false,
						description: 'Whether to extract the source URL from the response',
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
				const operation = this.getNodeParameter('operation', i) as string;
				const model = this.getNodeParameter('model', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const options = this.getNodeParameter('options', i, {}) as {
					temperature?: number;
					maxOutputTokens?: number;
					topP?: number;
					topK?: number;
					extractSourceUrl?: boolean;
				};

				let systemInstruction = this.getNodeParameter('systemInstruction', i, '') as string;
				
				if (operation === 'webSearch') {
					const organization = this.getNodeParameter('organization', i, '') as string;
					
					if (organization && !systemInstruction) {
						systemInstruction = `You are an expert in retrieving and providing information strictly within the domain of ${organization} and topics directly related to this organization. When answering queries, provide only the most relevant and natural response without unnecessary related information. Do not list multiple similar names, be strict on names or unrelated details. If a query falls outside this scope, politely inform the user that you are limited to ${organization}-related topics. Your response should answer the question directly without saying 'based on search'.`;
					}
				}

				const requestBody: any = {
					contents: [
						{
							role: 'user',
							parts: [
								{
									text: prompt,
								},
							],
						},
					],
					generationConfig: {
						temperature: options.temperature || 0.6,
						topP: options.topP || 1,
						topK: options.topK || 1,
						maxOutputTokens: options.maxOutputTokens || 2048,
						responseMimeType: 'text/plain',
					},
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

				if (operation === 'webSearch') {
					requestBody.tools = [
						{
							googleSearch: {},
						},
					];
				}

				const response = await geminiRequest.call(this, model, requestBody);

				// Function to extract source URL from groundingMetadata
				const extractSourceUrl = (responseObj: any): string => {
					const possiblePaths = [
						responseObj?.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri
					];
					
					// Return the first valid URL
					return possiblePaths.find(url => typeof url === "string" && 
						(url.startsWith("http://") || url.startsWith("https://"))) || "";
				};

				// Function to get final redirected URL
				const getRedirectedUrl = async (url: string): Promise<string> => {
					if (!url) return "";
					
					try {
						const response = await axios.get(url, { 
							maxRedirects: 5,
							validateStatus: status => status < 400
						});
						return response.request.res.responseUrl || url;
					} catch (error) {
						// If there's an error, return the original URL
						return url;
					}
				};

				const outputJson: any = {
					response: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
					fullResponse: response,
				};

				if (options.extractSourceUrl) {
					const sourceUrl = extractSourceUrl(response);
					outputJson.sourceUrl = sourceUrl;
					
					// Get redirected URL if source URL exists
					if (sourceUrl) {
						try {
							outputJson.redirectedSourceUrl = await getRedirectedUrl(sourceUrl);
						} catch (error) {
							outputJson.redirectedSourceUrl = sourceUrl;
							outputJson.redirectError = error.message;
						}
					}
				}

				returnData.push({
					json: outputJson,
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
