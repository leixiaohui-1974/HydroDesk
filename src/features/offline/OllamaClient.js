/**
 * OllamaClient - Local LLM inference via Ollama
 *
 * Provides local language model capabilities for:
 * - Intent routing (classify user queries)
 * - Q&A with knowledge context
 * - Text generation and summarization
 *
 * Default model: Qwen-2.5-7B
 */

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:7b';

class OllamaClient {
  constructor(baseUrl = DEFAULT_OLLAMA_URL, model = DEFAULT_MODEL) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeout = 60000; // 60s for local inference
  }

  /**
   * Set the Ollama server URL
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Set the default model
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * Check if Ollama is running and accessible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models on the local Ollama instance
   * @returns {Promise<Array<{name: string, size: number, modified_at: string}>>}
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return (data.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
        parameter_size: m.details?.parameter_size || 'Unknown',
        family: m.details?.family || 'Unknown',
      }));
    } catch (err) {
      console.error('[OllamaClient] Failed to list models:', err);
      return [];
    }
  }

  /**
   * Generate a chat response using the local model
   * @param {string} prompt - The user prompt
   * @param {object} options - Additional options
   * @param {string} options.system - System prompt
   * @param {string} options.model - Override default model
   * @param {number} options.temperature - Sampling temperature (0-1)
   * @param {boolean} options.stream - Whether to stream (default: false)
   * @returns {Promise<string>} The generated response text
   */
  async chat(prompt, options = {}) {
    const model = options.model || this.model;
    const body = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1024,
      },
    };

    if (options.system) {
      body.system = options.system;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (err) {
      console.error('[OllamaClient] Chat failed:', err);
      throw err;
    }
  }

  /**
   * Route user intent using the local model
   * Classifies the user's query into one of the predefined intents.
   * @param {string} query - User input
   * @returns {Promise<{intent: string, confidence: number, params: object}>}
   */
  async routeIntent(query) {
    const systemPrompt = `你是一个水利水网系统的意图识别模块。根据用户输入，识别用户意图并返回JSON格式结果。

可选意图类型：
- query_knowledge: 查询知识库（规范、手册、文档）
- run_simulation: 运行仿真模拟
- check_status: 查看系统/站点状态
- build_model: 构建或编辑模型
- analyze_data: 数据分析
- emergency: 应急处置查询
- general_chat: 一般对话

请只返回JSON，格式如下：
{"intent": "意图类型", "confidence": 0.0-1.0, "params": {"key": "value"}}`;

    try {
      const response = await this.chat(query, {
        system: systemPrompt,
        temperature: 0.1,
        maxTokens: 256,
      });

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { intent: 'general_chat', confidence: 0.5, params: {} };
    } catch (err) {
      console.error('[OllamaClient] Intent routing failed:', err);
      return { intent: 'general_chat', confidence: 0.0, params: {} };
    }
  }

  /**
   * Answer a question with context from knowledge base
   * @param {string} question - User question
   * @param {Array<string>} contexts - Relevant knowledge snippets
   * @returns {Promise<string>}
   */
  async answerWithContext(question, contexts = []) {
    const contextText = contexts.length > 0
      ? `参考资料：\n${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n\n`
      : '';

    const systemPrompt = `你是水利水网领域的智能助手。基于提供的参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知。回答要准确、专业、简洁。`;

    return this.chat(`${contextText}问题：${question}`, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });
  }

  /**
   * Get Ollama server version info
   * @returns {Promise<object>}
   */
  async getVersion() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (err) {
      console.error('[OllamaClient] Failed to get version:', err);
      return null;
    }
  }
}

// Singleton instance
const ollamaClient = new OllamaClient();
export default ollamaClient;
export { OllamaClient };
