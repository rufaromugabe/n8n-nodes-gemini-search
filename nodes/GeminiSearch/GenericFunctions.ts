import type {
  IDataObject,
  IExecuteFunctions,
  IHookFunctions,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  IWebhookFunctions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * Utility function for sleep/delay
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function geminiRequest(
  this:
    | IExecuteFunctions
    | IHookFunctions
    | ILoadOptionsFunctions
    | IWebhookFunctions,
  model: string,
  body: object,
) {
  const credentials = await this.getCredentials('geminiSearchApi');

  if (!credentials) {
    throw new NodeOperationError(this.getNode(), 'No credentials provided!');
  }

  const apiKey = credentials.apiKey;
  const host = credentials.host || 'https://generativelanguage.googleapis.com';

  const options: IHttpRequestOptions = {
    method: 'POST',
    url: `${host}/v1beta/models/${model}:generateContent`,
    qs: {
      key: apiKey as string,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    json: true,
  };

  try {
    if (!this.helpers?.httpRequest) {
      throw new NodeOperationError(
        this.getNode(),
        'Helpers are not available!',
      );
    }
    const response = await this.helpers.httpRequest(options);
    if (!response) {
      throw new NodeOperationError(
        this.getNode(),
        'No response from API request',
      );
    }
    return response;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}

export async function getModels(
  this:
    | IExecuteFunctions
    | IHookFunctions
    | ILoadOptionsFunctions
    | IWebhookFunctions,
): Promise<string[]> {
  const credentials = await this.getCredentials('geminiSearchApi');

  if (!credentials) {
    throw new NodeOperationError(this.getNode(), 'No credentials provided!');
  }

  const apiKey = credentials.apiKey;
  const host = credentials.host || 'https://generativelanguage.googleapis.com';

  const options: IHttpRequestOptions = {
    method: 'GET',
    url: `${host}/v1beta/models`,
    qs: {
      key: apiKey as string,
    },
    json: true,
  };

  try {
    if (!this.helpers?.httpRequest) {
      throw new NodeOperationError(
        this.getNode(),
        'Helpers are not available!',
      );
    }
    const response = (await this.helpers.httpRequest(options)) as IDataObject;
    if (!response?.models) {
      throw new NodeOperationError(
        this.getNode(),
        'No response or models from API request',
      );
    }
    // Filter for models that support 'generateContent' and return their names
    const models = response.models as IDataObject[];
    return models
      .filter((model) =>
        (model.supportedGenerationMethods as string[] | undefined)?.includes(
          'generateContent',
        ),
      )
      .map((model) => String(model.name).replace('models/', ''));
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}
