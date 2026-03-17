import React, { useState } from 'react';

const Section = ({ title, description, children }) => (
  <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
    <h2 className="text-sm font-semibold text-slate-200 mb-1">{title}</h2>
    {description && <p className="text-xs text-slate-500 mb-4">{description}</p>}
    <div className="space-y-3">{children}</div>
  </div>
);

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="text-sm text-slate-300">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-10 h-5 rounded-full transition-colors ${
      enabled ? 'bg-hydro-600' : 'bg-slate-600'
    }`}
  >
    <span
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export default function Settings({ isTauri }) {
  const [settings, setSettings] = useState({
    hydromindUrl: 'http://localhost:8000',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'qwen2.5:7b',
    offlineMode: false,
    autoSync: true,
    darkMode: true,
    language: 'zh-CN',
    cacheSize: '2',
    autoUpdate: true,
    telemetry: false,
  });

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">系统设置</h1>
        <p className="text-sm text-slate-400 mt-1">配置引擎连接、LLM模型、离线模式等参数</p>
      </div>

      {/* Backend connection */}
      <Section title="后端连接" description="HydroMind 后端服务器配置">
        <SettingRow label="HydroMind 地址" description="后端 API 服务器地址">
          <input
            type="text"
            value={settings.hydromindUrl}
            onChange={(e) => updateSetting('hydromindUrl', e.target.value)}
            className="w-60 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          />
        </SettingRow>
        <SettingRow label="自动同步" description="自动将本地修改同步到云端">
          <Toggle
            enabled={settings.autoSync}
            onChange={(v) => updateSetting('autoSync', v)}
          />
        </SettingRow>
      </Section>

      {/* LLM configuration */}
      <Section title="LLM 配置" description="本地大语言模型和推理引擎配置">
        <SettingRow label="Ollama 地址" description="本地 Ollama 推理引擎地址">
          <input
            type="text"
            value={settings.ollamaUrl}
            onChange={(e) => updateSetting('ollamaUrl', e.target.value)}
            className="w-60 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          />
        </SettingRow>
        <SettingRow label="默认模型" description="用于意图识别和问答的本地模型">
          <select
            value={settings.ollamaModel}
            onChange={(e) => updateSetting('ollamaModel', e.target.value)}
            className="w-60 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          >
            <option value="qwen2.5:7b">Qwen-2.5-7B</option>
            <option value="qwen2.5:14b">Qwen-2.5-14B</option>
            <option value="llama3.1:8b">Llama-3.1-8B</option>
            <option value="deepseek-r1:7b">DeepSeek-R1-7B</option>
          </select>
        </SettingRow>
      </Section>

      {/* Offline mode */}
      <Section title="离线模式" description="配置离线运行时的缓存和降级策略">
        <SettingRow label="离线模式" description="断网时自动切换到本地推理和缓存数据">
          <Toggle
            enabled={settings.offlineMode}
            onChange={(v) => updateSetting('offlineMode', v)}
          />
        </SettingRow>
        <SettingRow label="缓存大小限制" description="本地缓存数据的最大存储空间 (GB)">
          <select
            value={settings.cacheSize}
            onChange={(e) => updateSetting('cacheSize', e.target.value)}
            className="w-60 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          >
            <option value="1">1 GB</option>
            <option value="2">2 GB</option>
            <option value="5">5 GB</option>
            <option value="10">10 GB</option>
          </select>
        </SettingRow>
        <div className="pt-2">
          <button className="px-3 py-1.5 text-xs bg-hydro-600/20 text-hydro-400 rounded-lg hover:bg-hydro-600/30 transition-colors mr-2">
            预下载离线数据
          </button>
          <button className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
            清除缓存
          </button>
        </div>
      </Section>

      {/* MCP Engines */}
      <Section title="MCP 引擎" description="管理已注册的计算引擎">
        <div className="space-y-2">
          {[
            { name: 'HydroOS', maintainer: '魏家好', port: 8001, desc: '操作系统内核' },
            { name: 'HydroAlgo', maintainer: '黄志峰', port: 8002, desc: '智能算法库' },
            { name: 'HydroFlow', maintainer: '王孝群', port: 8003, desc: '水力学模型' },
            { name: 'HydroQuality', maintainer: '施垚', port: 8004, desc: '水质冰期模型' },
          ].map((engine) => (
            <div
              key={engine.name}
              className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/30"
            >
              <div>
                <div className="text-sm text-slate-200">{engine.name}</div>
                <div className="text-xs text-slate-500">
                  {engine.maintainer} - {engine.desc}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">:{engine.port}</span>
                <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                  测试
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* General */}
      <Section title="通用设置" description="界面和系统通用配置">
        <SettingRow label="界面语言">
          <select
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
            className="w-60 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </SettingRow>
        <SettingRow label="自动更新" description="自动检查并安装应用更新">
          <Toggle
            enabled={settings.autoUpdate}
            onChange={(v) => updateSetting('autoUpdate', v)}
          />
        </SettingRow>
        <SettingRow label="匿名数据" description="发送匿名使用数据帮助改进产品">
          <Toggle
            enabled={settings.telemetry}
            onChange={(v) => updateSetting('telemetry', v)}
          />
        </SettingRow>
      </Section>

      {/* App info */}
      <div className="text-xs text-slate-600 text-center pt-4">
        HydroDesk v0.1.0 | Tauri {isTauri ? '✓' : '✗'} | HydroMind 水网桌面端
      </div>
    </div>
  );
}
