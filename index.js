module.exports = {
	nodeTypes: {
		GeminiSearch: require('./dist/nodes/GeminiSearch/GeminiSearch.node.js').GeminiSearch,
		GeminiSearchTool: require('./dist/nodes/GeminiSearch/GeminiSearchTool.node.js').GeminiSearchTool,
	},
	credentialTypes: {
		GeminiSearchApiCredentials: require('./dist/credentials/GeminiSearchApiCredentials.credentials.js').GeminiSearchApiCredentials,
	}
};
