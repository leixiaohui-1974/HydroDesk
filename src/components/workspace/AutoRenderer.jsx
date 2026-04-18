import React from 'react';

export default function AutoRenderer({ path, content }) {
  if (!content) return <div className="text-slate-500 text-sm">暂无内容</div>;
  
  const ext = path.split('.').pop()?.toLowerCase();
  
  if (ext === 'html') {
    return (
      <div className="w-full h-full bg-white">
        <iframe
          title="HTML Preview"
          srcDoc={content}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }
  
  if (ext === 'json' || path.endsWith('.contract.json')) {
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return <pre className="text-red-400 text-xs p-4">{e.message}</pre>;
    }
    
    return (
      <div className="p-4 bg-slate-950 text-slate-300 font-mono text-xs overflow-auto h-full">
        <h3 className="text-hydro-400 font-bold mb-4 border-b border-slate-700 pb-2">
          {path.endsWith('.contract.json') ? '契约文件预览' : 'JSON 数据预览'}
        </h3>
        <pre className="whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
      </div>
    );
  }
  
  if (ext === 'md') {
    return (
      <div className="p-6 bg-slate-900 text-slate-200 overflow-auto h-full prose prose-invert max-w-none">
        <h3 className="text-hydro-300 font-bold mb-4 border-b border-slate-700 pb-2">Markdown 预览 (原始文本)</h3>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{content}</pre>
      </div>
    );
  }
  
  if (ext === 'yaml' || ext === 'yml') {
    return (
      <div className="p-4 bg-slate-950 text-slate-300 font-mono text-xs overflow-auto h-full">
        <h3 className="text-emerald-400 font-bold mb-4 border-b border-slate-700 pb-2">YAML 配置预览</h3>
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    );
  }

  return (
    <div className="p-4 text-slate-400 text-sm">
      不支持自动渲染该文件类型 ({ext})。请切换回编辑模式查看源码。
    </div>
  );
}
