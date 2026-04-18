import React, { useState } from 'react';
import { runWorkspaceCommand } from '../api/tauri_bridge';
import { buildNlMcpGatewayCommand, parseNlGatewayStdout } from '../config/hydrodesk_commands';

export default function OmniBar({ onReportGenerated }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Calls the underlying MCP server (via a lightweight python client wrapper if needed, 
  // or via direct agent invocation) to honor architectural rules:
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // By architectural rules: Do not bypass MCP / workflows! 
      // We use a python gateway that routes the natural language query into the MCP system.
      // (Assuming `Hydrology/mcp_server.py` and its agents process this query via MCP tools)
      
      const mcpCommand = buildNlMcpGatewayCommand(query);
      const result = await runWorkspaceCommand(mcpCommand, '.');

      if (result?.stdout) {
        const parsedReport = parseNlGatewayStdout(result.stdout);
        if (parsedReport && onReportGenerated) {
          onReportGenerated(parsedReport);
        } else if (!parsedReport) {
          console.error('Failed to parse MCP NL stdout (expected JSON line)', result.stdout?.slice(0, 200));
        }
      }
    } catch(err) {
      console.error("OmniBar execution error: ", err);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl relative">
      <form onSubmit={handleQuery} className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/50 p-2 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex-1 px-4 text-emerald-400">
          <span className="mr-2 text-slate-500">{"❯"}</span>
          <input
            type="text"
            className="bg-transparent border-none outline-none w-[90%] text-sm text-slate-200 placeholder-slate-600"
            placeholder="Type a natural language command (e.g., 'Run fast validation via MCP')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-hydro-500/20 text-hydro-300 text-xs font-semibold rounded-xl border border-hydro-500/30 hover:bg-hydro-500/30 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing MCP...' : 'Execute'}
        </button>
      </form>
    </div>
  );
}
