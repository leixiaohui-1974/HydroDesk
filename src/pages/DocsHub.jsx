import { useMemo, useState } from 'react';
import { openPath } from '../api/tauri_bridge';
import { studioAccounts } from '../data/accountCatalog';
import {
  hydroDeskAccountDocMap,
  hydroDeskDocGroups,
  hydroDeskDocsCatalog,
  hydroDeskPageDocMap,
} from '../data/docsCatalog';

function DocCard({ doc }) {
  const [openBusy, setOpenBusy] = useState(false);

  const handleOpen = async () => {
    setOpenBusy(true);
    try {
      await openPath(doc.path);
    } finally {
      setOpenBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
      <div className="text-sm font-semibold text-slate-100">{doc.title}</div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{doc.summary}</div>
      <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-500">
        {doc.path}
      </div>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-3 rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
      >
        {openBusy ? '打开中…' : '打开文档'}
      </button>
    </div>
  );
}

export default function DocsHub() {
  const [selectedPage, setSelectedPage] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const groupedDocs = useMemo(
    () =>
      hydroDeskDocGroups.map((group) => ({
        ...group,
        docs: hydroDeskDocsCatalog.filter((doc) => doc.group === group.key),
      })),
    []
  );
  const pageScopedDocKeys = selectedPage === 'all' ? null : hydroDeskPageDocMap[selectedPage] || [];
  const accountScopedDocKeys = selectedAccount === 'all' ? null : hydroDeskAccountDocMap[selectedAccount] || [];
  const filteredDocs = useMemo(() => {
    return hydroDeskDocsCatalog.filter((doc) => {
      if (pageScopedDocKeys && !pageScopedDocKeys.includes(doc.key)) return false;
      if (accountScopedDocKeys && !accountScopedDocKeys.includes(doc.key)) return false;
      return true;
    });
  }, [accountScopedDocKeys, pageScopedDocKeys]);
  const filteredGroupedDocs = useMemo(
    () =>
      hydroDeskDocGroups
        .map((group) => ({
          ...group,
          docs: filteredDocs.filter((doc) => doc.group === group.key),
        }))
        .filter((group) => group.docs.length > 0),
    [filteredDocs]
  );

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
              Docs Hub
            </div>
            <h1 className="mt-4 text-3xl font-bold text-slate-100">HydroDesk 文档中心</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              统一承接系统逻辑、账号使用、页面开发、后台工作流和当前进度差距文档。桌面模式下可直接打开本地文档。
            </p>
          </div>
          <div className="w-64 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
            <div className="text-[11px] text-slate-500">推荐阅读顺序</div>
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              <div>1. 完整逻辑与开发指南</div>
              <div>2. 术语表</div>
              <div>3. 用户操作路径与时序图</div>
              <div>4. 功能-脚本-合同矩阵</div>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr,1fr,220px]">
          <div>
            <div className="text-[11px] text-slate-500">按页面筛选</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: 'all', label: '全部页面' },
                { key: 'projects', label: 'ProjectCenter' },
                { key: 'review', label: 'ReviewDelivery' },
                { key: 'monitor', label: 'Monitor' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedPage(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    selectedPage === item.key
                      ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                      : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">按账号筛选</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedAccount('all')}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  selectedAccount === 'all'
                    ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                    : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
                }`}
              >
                全部账号
              </button>
              {Object.values(studioAccounts).map((account) => (
                <button
                  key={account.key}
                  type="button"
                  onClick={() => setSelectedAccount(account.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    selectedAccount === account.key
                      ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                      : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
                  }`}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
            <div className="text-[11px] text-slate-500">当前结果</div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">{filteredDocs.length}</div>
            <div className="mt-1 text-xs text-slate-400">篇文档命中当前筛选</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <h2 className="text-lg font-semibold text-slate-100">页面说明直达</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {Object.entries(hydroDeskPageDocMap).map(([pageKey, docKeys]) => (
            <div
              id={pageKey === 'projects' ? 'page-projectcenter' : pageKey === 'review' ? 'page-review' : 'page-monitor'}
              key={pageKey}
              className="rounded-2xl border border-slate-700/50 bg-slate-950/30 p-4"
            >
              <div className="text-sm font-semibold text-slate-100">
                {pageKey === 'projects' ? 'ProjectCenter' : pageKey === 'review' ? 'ReviewDelivery' : 'Monitor'}
              </div>
              <div className="mt-2 space-y-2">
                {docKeys.map((docKey) => {
                  const doc = hydroDeskDocsCatalog.find((item) => item.key === docKey);
                  if (!doc) return null;
                  return (
                    <div key={doc.key} className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2">
                      <div className="text-xs text-slate-200">{doc.title}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{doc.summary}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {filteredGroupedDocs.map((group) => (
        <section key={group.key} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h2 className="text-lg font-semibold text-slate-100">{group.label}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {group.docs.map((doc) => (
              <DocCard key={doc.key} doc={doc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
