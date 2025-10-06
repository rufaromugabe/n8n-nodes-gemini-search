import axios from 'axios';
import type { IExecuteFunctions } from 'n8n-workflow';
import { geminiRequest } from './GenericFunctions';
import {
  buildSystemInstruction,
  buildUserQueryWithUrlContext,
} from './instructionBuilder';

/**
 * Options for building a Gemini API request
 */
export interface IGeminiRequestOptions {
  model: string;
  prompt: string;
  operation?: 'webSearch' | 'generateContent';
  systemInstruction?: string;
  organization?: string;
  restrictUrls?: string;
  enableUrlContext?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Options for processing the response
 */
export interface IResponseProcessingOptions {
  extractSourceUrl?: boolean;
  includeFullResponse?: boolean;
  includeRestrictedUrls?: boolean;
  restrictUrls?: string;
  operation?: string;
}

/**
 * The processed output from a Gemini API call
 */
export interface IGeminiOutput {
  response?: string;
  result?: string;
  fullResponse?: any;
  sourceUrl?: string;
  redirectedSourceUrl?: string;
  redirectError?: string;
  urlContextMetadata?: any;
  restrictedUrls?: string;
  query?: string;
  organization?: string;
}

/**
 * Builds the request body for a Gemini API call
 */
export function buildGeminiRequestBody(options: IGeminiRequestOptions): any {
  const {
    prompt,
    operation = 'webSearch',
    systemInstruction,
    organization,
    restrictUrls,
    enableUrlContext,
    temperature,
    maxOutputTokens = 8192,
    topP,
    topK,
  } = options;

  // Build system instruction
  const finalSystemInstruction = buildSystemInstruction({
    systemInstruction,
    organization,
  });

  // Build user query with URL context if enabled and URLs are provided
  const hasUrls = restrictUrls && restrictUrls.trim() !== '';
  const shouldUseUrlContext = enableUrlContext && hasUrls;
  const finalPrompt = shouldUseUrlContext
    ? buildUserQueryWithUrlContext(prompt, restrictUrls)
    : prompt;

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: finalPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens,
      responseMimeType: 'text/plain',
    },
  };

  // Add temperature only if explicitly set (including 0)
  if (temperature !== undefined) {
    requestBody.generationConfig.temperature = temperature;
  } else {
    requestBody.generationConfig.temperature = 0.6; // Default value
  }

  // Only add topP and topK if they are explicitly set
  if (topP !== undefined) {
    requestBody.generationConfig.topP = topP;
  }
  if (topK !== undefined) {
    requestBody.generationConfig.topK = topK;
  }

  // Initialize tools array
  requestBody.tools = [];

  if (operation === 'webSearch') {
    requestBody.tools.push({ googleSearch: {} });
    if (shouldUseUrlContext) {
      requestBody.tools.push({ urlContext: {} });
    }
  }

  // Remove empty tools array if no tools were added
  if (requestBody.tools.length === 0) {
    delete requestBody.tools;
  }

  // Add system instruction if provided
  if (finalSystemInstruction) {
    requestBody.systemInstruction = {
      parts: [
        {
          text: finalSystemInstruction,
        },
      ],
    };
  }

  return requestBody;
}

/**
 * Extracts the source URL from a Gemini API response
 */
export function extractSourceUrl(responseObj: any): string {
  const possiblePaths = [
    responseObj?.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web
      ?.uri,
  ];
  return (
    possiblePaths.find(
      (url) =>
        typeof url === 'string' &&
        (url.startsWith('http://') || url.startsWith('https://')),
    ) || ''
  );
}

/**
 * Gets the final redirected URL by following redirects
 */
export async function getRedirectedUrl(url: string): Promise<string> {
  if (!url) return '';
  try {
    const response = await axios.head(url, {
      maxRedirects: 10,
      timeout: 5000,
      validateStatus: null, // Don't throw on any status code
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // Check for the final URL in multiple places
    const finalUrl =
      response.request?.res?.responseUrl || // Node.js response
      response.request?.responseURL || // Browser response
      (typeof response.request === 'object' && 'res' in response.request
        ? response.request.res.headers?.location
        : null) || // Check location header
      url; // Fallback to original URL

    return finalUrl;
  } catch (error: any) {
    console.error(`Error fetching redirected URL: ${error.message}`);
    return url;
  }
}

/**
 * Processes a Gemini API response and formats the output
 */
export async function processGeminiResponse(
  response: any,
  options: IResponseProcessingOptions = {},
): Promise<IGeminiOutput> {
  const {
    extractSourceUrl: shouldExtractUrl = false,
    includeFullResponse = false,
    includeRestrictedUrls = false,
    restrictUrls,
    operation,
  } = options;

  const outputJson: IGeminiOutput = {
    response: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
  };

  // Add url_context_metadata to the output if it exists
  if (response.candidates?.[0]?.url_context_metadata) {
    outputJson.urlContextMetadata = response.candidates[0].url_context_metadata;
  }

  // Add restricted URLs if applicable
  if (includeRestrictedUrls && operation === 'webSearch' && restrictUrls) {
    outputJson.restrictedUrls = restrictUrls;
  }

  // Extract source URL if requested
  if (shouldExtractUrl) {
    const sourceUrl = extractSourceUrl(response);
    outputJson.sourceUrl = sourceUrl;

    // Get redirected URL if source URL exists
    if (sourceUrl) {
      try {
        outputJson.redirectedSourceUrl = await getRedirectedUrl(sourceUrl);
      } catch (error: any) {
        outputJson.redirectedSourceUrl = sourceUrl;
        outputJson.redirectError = error.message;
      }
    }
  }

  // Include full response if requested
  if (includeFullResponse) {
    outputJson.fullResponse = response;
  }

  return outputJson;
}

/**
 * Executes a Gemini API request with the given options
 */
export async function executeGeminiRequest(
  context: IExecuteFunctions,
  requestOptions: IGeminiRequestOptions,
  responseOptions: IResponseProcessingOptions = {},
): Promise<IGeminiOutput> {
  const requestBody = buildGeminiRequestBody(requestOptions);
  const response = await geminiRequest.call(
    context,
    requestOptions.model,
    requestBody,
  );
  return await processGeminiResponse(response, responseOptions);
}
