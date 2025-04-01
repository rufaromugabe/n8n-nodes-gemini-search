import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeConnection,
} from 'n8n-workflow';
import { geminiRequest } from './GenericFunctions';
import axios from 'axios';

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
					{
						displayName: 'Return Full Response',
						name: 'returnFullResponse',
						type: 'boolean',
						default: false,
						description: 'Whether to return the full API response',
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
				const query = this.getNodeParameter('query', i) as string;
				const model = this.getNodeParameter('model', i) as string;
				const organization = this.getNodeParameter('organization', i, '') as string;
				const options = this.getNodeParameter('options', i, {}) as {
					temperature?: number;
					maxOutputTokens?: number;
					systemInstruction?: string;
					returnFullResponse?: boolean;
					extractSourceUrl?: boolean;
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
						const response = await axios.head(url, { 
							maxRedirects: 10,
							timeout: 5000,
							validateStatus: null, // Don't throw on any status code
							headers: {
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
							}
						});
						
						// Check for the final URL in multiple places
						const finalUrl = 
							response.request?.res?.responseUrl || // Node.js response
							response.request?.responseURL ||      // Browser response
							(typeof response.request === 'object' && 'res' in response.request ? 
								response.request.res.headers?.location : null) || // Check location header
							url; // Fallback to original URL
							
						return finalUrl;
					} catch (error) {
						// Return more error details for debugging
						console.error(`Error fetching redirected URL: ${error.message}`);
						return url;
					}
				};

				const outputData: {
					result: string;
					query: string;
					organization: string;
					sourceUrl?: string;
					redirectedSourceUrl?: string;
					fullResponse?: any;
				} = {
					result: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
					query,
					organization,
				};

				if (options.extractSourceUrl) {
					const sourceUrl = extractSourceUrl(response);
					outputData.sourceUrl = sourceUrl;
					
					// Get redirected URL if source URL exists
					if (sourceUrl) {
						try {
							outputData.redirectedSourceUrl = await getRedirectedUrl(sourceUrl);
						} catch (error) {
							outputData.redirectedSourceUrl = sourceUrl;
						}
					}
				}

				if (options.returnFullResponse) {
					outputData.fullResponse = response;
				}

				returnData.push({
					json: outputData,
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
