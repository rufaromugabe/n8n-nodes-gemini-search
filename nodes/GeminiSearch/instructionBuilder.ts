export function buildSystemInstruction(options: {
    systemInstruction?: string;
    organization?: string;
    restrictUrls?: string;
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

    // Add URL restrictions if they exist
    if (options.restrictUrls) {
        const urlList = options.restrictUrls.split(',').map(url => url.trim()).filter(url => url !== '');
        if (urlList.length > 0) {
            if (systemInstruction) {
                systemInstruction += ` Limit your search to information found on these specific websites: ${urlList.join(', ')}.`;
            } else {
                systemInstruction = `Limit your search to information found on these specific websites: ${urlList.join(', ')}. Provide a direct, concise answer based on information from these sources only.`;
            }
        }
    }

    return systemInstruction;
}
