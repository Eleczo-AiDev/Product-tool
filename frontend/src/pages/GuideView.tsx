import React from 'react';
import { Lightbulb, HelpCircle, AlertTriangle, Info } from 'lucide-react';

type Kind = 'tip' | 'when' | 'caution' | 'note';
const boxStyle: Record<Kind, { bg: string; bar: string; icon: React.ReactNode; label: string; text: string }> = {
  tip: { bg: 'bg-emerald-500/10', bar: 'border-emerald-500', icon: <Lightbulb size={15} className="text-emerald-400" />, label: 'Tip', text: 'text-emerald-300' },
  when: { bg: 'bg-blue-500/10', bar: 'border-blue-500', icon: <HelpCircle size={15} className="text-blue-400" />, label: 'When to use', text: 'text-blue-300' },
  caution: { bg: 'bg-red-500/10', bar: 'border-red-500', icon: <AlertTriangle size={15} className="text-red-400" />, label: 'Caution', text: 'text-red-300' },
  note: { bg: 'bg-zinc-800', bar: 'border-zinc-500', icon: <Info size={15} className="text-zinc-200" />, label: 'Note', text: 'text-zinc-300' },
};
function Callout({ kind, children }: { kind: Kind; children: React.ReactNode }) {
  const s = boxStyle[kind];
  return (
    <div className={`${s.bg} border-l-4 ${s.bar} rounded-r-md px-3 py-2 my-3 text-sm text-zinc-200`}>
      <span className={`font-semibold ${s.text} inline-flex items-center gap-1 mr-1`}>{s.icon}{s.label}:</span>
      {children}
    </div>
  );
}
function Badge({ n }: { n: number }) {
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold mr-2 shrink-0">{n}</span>;
}
function Annot({ items }: { items: [number, React.ReactNode][] }) {
  return (
    <ul className="my-3 space-y-1.5">
      {items.map(([n, t]) => (
        <li key={n} className="flex items-start text-sm text-zinc-200"><Badge n={n} /><span>{t}</span></li>
      ))}
    </ul>
  );
}
function Figure({ src, alt, caption, max = 'max-w-3xl' }: { src: string; alt: string; caption: string; max?: string }) {
  return (
    <figure className="my-4">
      <img src={src} alt={alt} className={`w-full ${max} mx-auto rounded-xl border border-zinc-800 shadow-sm`} />
      <figcaption className="text-center text-xs text-zinc-400 italic mt-1.5">{caption}</figcaption>
    </figure>
  );
}
function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-lg font-bold text-zinc-100 mt-8 mb-2 pb-1 border-b border-zinc-800 scroll-mt-4">{children}</h2>;
}

const SECTIONS = [
  ['quickstart', '1. Quick start'],
  ['workspaces', '2. The workspaces'],
  ['products', '3. The Products screen'],
  ['editing', '4. Creating & editing a product'],
  ['import', '5. Importing products'],
  ['sets', '6. Product types & routing'],
  ['fields', '7. Field guide (plain language)'],
  ['publish', '8. Publishing'],
  ['cheatsheet', '9. What to use, when'],
  ['gotchas', '10. Tips & gotchas'],
] as const;

export default function GuideView() {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="grid grid-cols-4 gap-6">
      {/* sidebar nav */}
      <aside className="col-span-1 hidden md:block">
        <div className="sticky top-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">User Guide</div>
          <nav className="space-y-1">
            {SECTIONS.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className="block w-full text-left text-sm text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800/60 rounded px-2 py-1">
                {label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* content */}
      <article className="col-span-4 md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6 leading-relaxed">
        <h1 className="text-2xl font-bold text-zinc-50">Product Tool — User Guide</h1>
        <p className="text-zinc-400 mt-1">How to use it — what to use, and when. The numbered markers in each picture match the notes beneath it.</p>

        <H id="quickstart">1. Quick start (first 15 minutes)</H>
        <p className="text-sm text-zinc-200">This takes one product from nothing to publish-ready.</p>
        <ol className="list-decimal ml-5 my-3 space-y-1.5 text-sm text-zinc-200">
          <li>You land on <b>Products</b>. The left sidebar switches between Products, Attribute Sets, Attributes, Masters, Audit Trail, Deleted and this Guide.</li>
          <li>Check your product types under <b>Attribute Sets</b> (e.g. MCCB, Wire & Cable). Create one if it’s missing (§6).</li>
          <li>Add one product: <b>Products → New product →</b> pick the set → fill the form (§4). Red asterisks mark mandatory fields.</li>
          <li>Or bulk-load: <b>Products → Import →</b> choose a CSV/Excel and let it auto-detect the type (§5).</li>
          <li>Open the product and use <b>Preview per-system payload</b> to see what HIVA, Magento and CRM each receive (§4).</li>
          <li><b>Publish</b> to queue it to all three systems with a delivery status each (§8).</li>
        </ol>
        <Callout kind="note">Publishing currently runs as a verified dry-run — it produces each system’s payload and marks delivery, but doesn’t yet write to the live Magento/CRM/HIVA. See §8.</Callout>

        <H id="workspaces">2. The four workspaces</H>
        <p className="text-sm text-zinc-200">Everything lives in the left sidebar. Most work is on Products; the rest is occasional setup.</p>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-zinc-800">
            <thead><tr className="bg-zinc-800 text-white text-left"><th className="px-3 py-2">Tab</th><th className="px-3 py-2">What it’s for</th></tr></thead>
            <tbody>
              {[['Products', 'Create, find, edit, import, export and publish products. Your main screen.'],
                ['Attribute Sets', 'Define product types: which fields each type has, and the routing values that send imported rows to it.'],
                ['Attributes', 'Define individual fields (label, type, dropdown options, mandatory flag).'],
                ['Masters', 'Maintain controlled lists like Item Brand, each value carrying its HIVA/Magento/CRM equivalent.'],
                ['Audit Trail', 'A live log of every change — who created, edited, published, reverted, restored or deleted what, and when.'],
                ['Deleted', 'Products you removed, kept safely so you can restore any of them. Nothing is purged automatically.']].map((r, i) => (
                <tr key={r[0]} className={i % 2 ? 'bg-zinc-800/40' : ''}><td className="px-3 py-2 font-medium border-t border-zinc-800">{r[0]}</td><td className="px-3 py-2 border-t border-zinc-800">{r[1]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="when">Stay on Products for normal work. Only open the other tabs when you need a new field, product type, or brand — and brands can even be added on the fly while editing (§4).</Callout>

        <H id="products">3. The Products screen</H>
        <Figure src="/guide/products.png" alt="Products screen" caption="Figure 1 — the Products list. Numbers match the notes below." />
        <Annot items={[
          [1, <><b>Import</b> — bulk-load products from CSV or Excel (§5).</>],
          [2, <><b>New product</b> — create one product by hand (§4).</>],
          [3, <><b>Columns</b> — each row shows its Code, Name and Brand.</>],
          [4, <><b>Systems</b> — three dots show HIVA / Magento / CRM delivery state (green = delivered).</>],
          [5, <><b>Open</b> — edit that product.</>],
          [6, <><b>Count</b> — “Showing 1–25 of 312” tells you the page and total.</>],
          [7, <><b>Pagination</b> — change rows-per-page (10/25/50/100) and move with Prev / Next.</>],
        ]} />
        <Callout kind="tip">Beside Import there’s <b>Export CSV</b> and <b>Export Excel</b> — export, edit in a spreadsheet, and re-import using the same columns.</Callout>

        <H id="editing">4. Creating and editing a product</H>
        <p className="text-sm text-zinc-200">New product asks which type (set) to use, then builds the form from that set. Groups become sections; each field shows the right control.</p>
        <Figure src="/guide/editor.png" alt="Product editor" caption="Figure 2 — the product editor." />
        <Annot items={[
          [1, <><b>List field as a combobox</b> — pick an option <i>or type a new value</i>. A new value you type is saved and appears next time (no more being stuck with only the preset choices).</>],
          [2, <><b>Item Brand (master)</b> — pick a brand, or choose “＋ Add new…” to create one on the spot.</>],
          [3, <><b>per-system toggle</b> — expand to override a field’s value for HIVA, Magento or CRM individually.</>],
          [4, <><b>Per-system payload preview</b> — the exact data each system will receive; leave a system blank to reuse the shared value.</>],
          [5, <><b>Save draft / Publish</b> — save without sending, or validate-and-queue to all systems. A <b>Product code is required</b> before either will save.</>],
        ]} />
        <Callout kind="when"><b>Per-system overrides:</b> only when a system needs a different representation (e.g. Poles = “3P” shared, but “POLE_3” for CRM). Otherwise enter the value once as shared and all three use it.</Callout>
        <Callout kind="caution"><b>Product Code must be unique, and is required to save.</b> Saving a code that already exists is rejected — this prevents duplicates. Re-opening a saved product and saving again <b>updates that same product</b>; it never creates a new one.</Callout>
        <Callout kind="tip"><b>History &amp; restore.</b> Open any product and click <b>History</b> to see every past version and <b>Restore</b> to roll it back. Deleting a product doesn’t lose it — it moves to the <b>Deleted</b> screen, where you can restore it any time.</Callout>

        <H id="import">5. Importing products</H>
        <p className="text-sm text-zinc-200">Import turns a spreadsheet into products in one go. Headers are matched to fields by label or code, so files from elsewhere usually map without renaming.</p>
        <Figure src="/guide/import.png" alt="Import dialog" caption="Figure 3 — the import dialog." max="max-w-md" />
        <Annot items={[
          [1, <><b>Product type</b> — how rows are routed (see the table below).</>],
          [2, <><b>Choose File</b> — CSV, .xlsx or .xls. The line beneath shows the row count and how many columns were recognized.</>],
          [3, <><b>Detected columns</b> — green chips are matched fields; anything unrecognized is listed as skipped.</>],
          [4, <><b>Result</b> — how many products were created, plus any row that had a problem and why.</>],
        ]} />
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-zinc-800">
            <thead><tr className="bg-zinc-800 text-white text-left"><th className="px-3 py-2">Mode</th><th className="px-3 py-2">What it does</th><th className="px-3 py-2">When to use</th></tr></thead>
            <tbody>
              {[['Auto-detect by category', 'Routes each row to the set whose routing values match the row’s Item Category / Subcategory / Family.', 'A mixed file with several product types (the normal case).'],
                ['All rows → set', 'Forces every row into the one set you pick.', 'A file you know is a single product type.'],
                ['“Set” column', 'A column named Set names the target per row; overrides auto-detect.', 'You want explicit row-by-row control with no setup.']].map((r, i) => (
                <tr key={r[0]} className={i % 2 ? 'bg-zinc-800/40' : ''}>{r.map((c, j) => <td key={j} className="px-3 py-2 border-t border-zinc-800">{j === 0 ? <b>{c}</b> : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="caution">If a row’s category matches no set, that row is reported and skipped — never put in the wrong type. The error tells you which value to add to a set’s routing values (§6).</Callout>
        <Callout kind="tip">New brands in the file are added to the Item Brand master automatically. New dropdown values (categories, units…) are added as options automatically too — the lists fill themselves out as you load data.</Callout>

        <H id="sets">6. Product types & routing (Attribute Sets)</H>
        <p className="text-sm text-zinc-200">A set is a product type — it decides which fields a product has. Two types that need different fields are two sets; types that share the same fields are one set, told apart by a dropdown value.</p>
        <Figure src="/guide/sets.png" alt="Attribute Sets screen" caption="Figure 4 — the Attribute Sets screen." />
        <Annot items={[
          [1, <><b>Set list</b> — your product types; click one to edit it.</>],
          [2, <><b>New set</b> — adds a product type that starts with the <b>standard shared fields</b> (Identification, Commerce, Logistics). It does <i>not</i> copy another type’s technical fields, so a new set won’t inherit MCCB’s Poles, Breaking capacity, etc.</>],
          [3, <><b>Routing values</b> — the Item Category / Subcategory / Family values that send an imported row here. Edit and Save; no code change.</>],
          [4, <><b>Groups</b> — the field sections on the form. Identification / Commerce / Logistics are shared by every type; Technical differs per type.</>],
        ]} />
        <Callout kind="when"><b>New set vs sub-category value:</b> make a new set only when the type needs different fields (an MCCB has Poles & Breaking capacity; a cable has Cross-section & Cores). If Single-core and Multi-core cables share the same fields, keep one Wire & Cable set and tell them apart with the Item Subcategory value.</Callout>
        <Callout kind="caution"><b>Route at the level where you split.</b> If MCCB and MCB are separate sets, give each the specific subcategory (“MCCB”, “MCB”) as its routing value — don’t give both the shared category “Low Voltage Switchgears”, or a row couldn’t tell which set it belongs to.</Callout>

        <H id="fields">7. Field guide in plain language</H>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-zinc-800">
            <thead><tr className="bg-zinc-800 text-white text-left"><th className="px-3 py-2">Field name</th><th className="px-3 py-2">Plain term</th><th className="px-3 py-2">Example</th></tr></thead>
            <tbody>
              {[['Item Brand', 'Brand', 'Siemens'],
                ['Item Family', 'Series / Range', '3VJ – Siemens'],
                ['Item SubFamily', 'Model', '3VJ1'],
                ['Item Category', 'Main Category', 'Low Voltage Switchgears'],
                ['Item Subcategory', 'Type', 'MCCB'],
                ['Product Type', 'Stock nature', 'Finished goods'],
                ['Cap/NonCap', 'Capital or not', 'Capital = depreciated asset; Non-Capital = normal stock'],
                ['HSN Code', 'Tax code', '85362090'],
                ['Front End Unit', 'Selling unit shown online', '/100 Mtrs']].map((r, i) => (
                <tr key={r[0]} className={i % 2 ? 'bg-zinc-800/40' : ''}><td className="px-3 py-2 font-medium border-t border-zinc-800">{r[0]}</td><td className="px-3 py-2 border-t border-zinc-800">{r[1]}</td><td className="px-3 py-2 border-t border-zinc-800">{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="note">These are display labels and can be renamed on the Attributes screen without any software change. On Masters, <b>Add value</b> gives you an empty row — just type the value and its HIVA/Magento/CRM equivalents.</Callout>

        <H id="publish">8. Publishing</H>
        <p className="text-sm text-zinc-200">Publish validates the product, then queues it to HIVA, Magento and CRM, showing a delivery status (Pending / Delivered / Failed) per system. You can publish one product or many.</p>
        <Callout kind="note">In the current build the connectors are simulated: they produce the exact payload each system would receive and mark delivery complete, but don’t yet write to the live systems. Connecting the real APIs is the go-live step and doesn’t change anything on screen.</Callout>
        <Callout kind="when">Publish after the per-system payload preview looks right and no mandatory field is flagged. You can re-publish any time; it won’t create duplicates downstream.</Callout>

        <H id="cheatsheet">9. “What to use, when” cheat-sheet</H>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-zinc-800">
            <thead><tr className="bg-zinc-800 text-white text-left"><th className="px-3 py-2">I want to…</th><th className="px-3 py-2">Do this</th></tr></thead>
            <tbody>
              {[['Add one product', 'Products → New product → pick set → fill form → Save / Publish.'],
                ['Add many products', 'Products → Import → CSV/Excel → Auto-detect by category.'],
                ['Put a value that isn’t in a dropdown', 'Just type it in the field — it’s saved as a new option. For Brand, choose “＋ Add new”.'],
                ['Make a system show a different value', 'Open the field’s per-system toggle and set HIVA / Magento / CRM individually.'],
                ['Add a new product type', 'Attribute Sets → New set → add its fields → set its routing values.'],
                ['Fix “row not mapped” on import', 'Add the row’s category value to the right set’s routing values.'],
                ['Stop duplicate products', 'Nothing — Product Code uniqueness is enforced automatically.'],
                ['See what a system will receive', 'Open the product → Preview per-system payload.']].map((r, i) => (
                <tr key={r[0]} className={i % 2 ? 'bg-zinc-800/40' : ''}><td className="px-3 py-2 font-medium border-t border-zinc-800">{r[0]}</td><td className="px-3 py-2 border-t border-zinc-800">{r[1]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <H id="gotchas">10. Tips & common gotchas</H>
        <ul className="list-disc ml-5 my-3 space-y-1.5 text-sm text-zinc-200">
          <li><b>Excel reformats codes.</b> Format HSN and product-code columns as Text in Excel so long numbers aren’t mangled before import.</li>
          <li><b>Mandatory first.</b> Red-asterisk fields must be filled before Publish; the editor flags any that are missing.</li>
          <li><b>Routing is data-driven.</b> Auto-detect only knows the category values you’ve put on sets — unknown ones are skipped and reported, not guessed.</li>
          <li><b>Typed values are kept verbatim.</b> “MCCB” and “mccb” would become two options; keep casing consistent.</li>
          <li><b>One set per product.</b> A product belongs to exactly one type at a time; switching types keeps shared fields and reveals the new type’s fields.</li>
        </ul>
      </article>
    </div>
  );
}
