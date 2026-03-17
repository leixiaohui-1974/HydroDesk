/**
 * HydroMind Client - HTTP client for HydroMind backend API
 *
 * Handles communication with the HydroMind cloud backend for:
 * - Agent conversations
 * - MCP engine invocation
 * - Knowledge base queries
 * - Simulation job management
 */

const DEFAULT_BASE_URL = 'http://localhost:8000';

class HydroMindClient {
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
    this.timeout = 30000;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Set base URL for the backend
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Make an HTTP request to the backend
   */
  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    const config = {
      method,
      headers,
      signal: AbortSignal.timeout(options.timeout || this.timeout),
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`HydroMind API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  // --- Health & Status ---

  async healthCheck() {
    return this.request('GET', '/health');
  }

  async getStatus() {
    return this.request('GET', '/api/v1/status');
  }

  // --- Agent Conversation ---

  async chat(message, sessionId = null) {
    return this.request('POST', '/api/v1/agent/chat', {
      message,
      session_id: sessionId,
    });
  }

  async getChatHistory(sessionId) {
    return this.request('GET', `/api/v1/agent/history/${sessionId}`);
  }

  // --- MCP Engines ---

  async listEngines() {
    return this.request('GET', '/api/v1/engines');
  }

  async invokeEngine(engineName, action, params = {}) {
    return this.request('POST', `/api/v1/engines/${engineName}/invoke`, {
      action,
      params,
    });
  }

  async getEngineStatus(engineName) {
    return this.request('GET', `/api/v1/engines/${engineName}/status`);
  }

  // --- Simulations ---

  async createSimulation(config) {
    return this.request('POST', '/api/v1/simulations', config);
  }

  async getSimulation(simulationId) {
    return this.request('GET', `/api/v1/simulations/${simulationId}`);
  }

  async listSimulations(page = 1, limit = 20) {
    return this.request('GET', `/api/v1/simulations?page=${page}&limit=${limit}`);
  }

  async runSimulation(simulationId) {
    return this.request('POST', `/api/v1/simulations/${simulationId}/run`);
  }

  async getSimulationResults(simulationId) {
    return this.request('GET', `/api/v1/simulations/${simulationId}/results`);
  }

  // --- Knowledge Base ---

  async searchKnowledge(query, topK = 5) {
    return this.request('POST', '/api/v1/knowledge/search', {
      query,
      top_k: topK,
    });
  }

  async getKnowledgeDocument(docId) {
    return this.request('GET', `/api/v1/knowledge/documents/${docId}`);
  }

  async listKnowledgeCategories() {
    return this.request('GET', '/api/v1/knowledge/categories');
  }

  // --- Monitoring ---

  async getStations() {
    return this.request('GET', '/api/v1/monitor/stations');
  }

  async getStationData(stationId, timeRange = '1h') {
    return this.request('GET', `/api/v1/monitor/stations/${stationId}/data?range=${timeRange}`);
  }

  async getAlerts(status = 'active') {
    return this.request('GET', `/api/v1/monitor/alerts?status=${status}`);
  }

  // --- Models ---

  async listModels() {
    return this.request('GET', '/api/v1/models');
  }

  async getModel(modelId) {
    return this.request('GET', `/api/v1/models/${modelId}`);
  }

  async saveModel(modelData) {
    return this.request('POST', '/api/v1/models', modelData);
  }

  async updateModel(modelId, modelData) {
    return this.request('PUT', `/api/v1/models/${modelId}`, modelData);
  }
}

// Singleton instance
const hydromindClient = new HydroMindClient();

export default hydromindClient;
export { HydroMindClient };
