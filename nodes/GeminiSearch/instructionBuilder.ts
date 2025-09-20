export function buildSystemInstruction(options: {
  systemInstruction?: string;
  organization?: string;
}): string {
  let systemInstruction = '';

  // Start with custom system instruction if it exists
  if (options.systemInstruction) {
    systemInstruction = options.systemInstruction;
  }
  // Otherwise use organization-based instruction if provided
  else if (options.organization) {
    systemInstruction = `You are an expert in retrieving and providing information strictly within the domain of ${options.organization} and topics directly related to this organization. When answering queries, provide only the most relevant and natural response without unnecessary related information. Do not list multiple similar names, be strict on names or unrelated details. If a query falls outside this scope, politely inform the user that you are limited to ${options.organization}-related topics. Your response should answer the question directly without saying 'based on search'.`;
  }

  return systemInstruction;
}

export function buildUserQueryWithUrlContext(query: string, restrictUrls?: string): string {
  if (!restrictUrls) {
    return query;
  }

  const urlList = restrictUrls
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url !== '');
  
  if (urlList.length === 0) {
    return query;
  }

  // Append URL context to the user query
  return `${query}\n\nHere is the URL(s) for your research:: ${urlList.join(', ')}.`;
}
