import React, { createContext, useContext, useState } from 'react';
import { Box, Layers, List as ListIcon, Database, PackageSearch, Check, BookOpen, Menu, ScrollText, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ProductsView from './pages/ProductsView';
import SetsView from './pages/SetsView';
import AttributesView from './pages/AttributesView';
import MastersView from './pages/MastersView';
import GuideView from './pages/GuideView';
import AuditView from './pages/AuditView';
import DeletedView from './pages/DeletedView';

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useFlash = () => useContext(ToastCtx);

type Tab = 'products' | 'sets' | 'attributes' | 'masters' | 'audit' | 'deleted' | 'guide';

export default function App() {
  const [tab, setTab] = useState<Tab>('products');
  const [toast, setToast] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const tabs: { id: Tab; label: string; icon: LucideIcon; hint: string }[] = [
    { id: 'products', label: 'Products', icon: Box, hint: 'Create, import & publish' },
    { id: 'sets', label: 'Attribute Sets', icon: Layers, hint: 'Product types & routing' },
    { id: 'attributes', label: 'Attributes', icon: ListIcon, hint: 'The fields' },
    { id: 'masters', label: 'Masters', icon: Database, hint: 'Brand & lists' },
    { id: 'audit', label: 'Audit Trail', icon: ScrollText, hint: 'Who changed what' },
    { id: 'deleted', label: 'Deleted', icon: Trash2, hint: 'Restore removed products' },
    { id: 'guide', label: 'Guide', icon: BookOpen, hint: 'How to use it' },
  ];
  const active = tabs.find((t) => t.id === tab)!;

  const NavItems = () => (
    <nav className="space-y-0.5">
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setNavOpen(false); }}
            className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
              on ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
            }`}
          >
            {on && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-zinc-100" />}
            <Icon size={17} className={on ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'} />
            <span className="min-w-0">
              <span className="block text-sm leading-tight">{t.label}</span>
              <span className="block text-[11px] leading-tight text-zinc-600 truncate">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
          <PackageSearch size={18} />
        </span>
        <div className="leading-tight">
          <div className="font-semibold text-zinc-100 tracking-tight">Product Tool</div>
          <div className="text-[11px] text-zinc-500">Product master</div>
        </div>
      </div>
      <div className="px-3 pb-2 pt-1"><NavItems /></div>
      <div className="mt-auto px-4 py-4">
        <div className="rounded-lg border border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-500">
          Syncs to <span className="text-zinc-300">HIVA</span>, <span className="text-zinc-300">Magento</span> & <span className="text-zinc-300">CRM</span>.
        </div>
      </div>
    </div>
  );

  return (
    <ToastCtx.Provider value={flash}>
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-800 bg-zinc-900 md:block">
          {SidebarInner}
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setNavOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-900">{SidebarInner}</aside>
          </div>
        )}

        <div className="md:pl-64">
          <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="flex items-center gap-3 px-5 py-3.5 max-w-6xl mx-auto">
              <button className="md:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => setNavOpen(true)}>
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{active.label}</h1>
                <p className="text-xs text-zinc-500 leading-tight">{active.hint}</p>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 py-6">
            {tab === 'products' && <ProductsView />}
            {tab === 'sets' && <SetsView />}
            {tab === 'attributes' && <AttributesView />}
            {tab === 'masters' && <MastersView />}
            {tab === 'audit' && <AuditView />}
            {tab === 'deleted' && <DeletedView />}
            {tab === 'guide' && <GuideView />}
          </main>
        </div>

        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-zinc-100 text-zinc-900 text-sm px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2">
            <Check size={15} className="text-emerald-600" />
            {toast}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
