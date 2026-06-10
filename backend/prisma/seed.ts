/**
 * Seed: builds the full attribute catalogue (the customer's product-creation
 * fields) + MCCB and Wire & Cable product types + one sample product.
 *
 * Idempotent guard: if the `price` attribute already exists, the seed is
 * skipped. Switching from an older seed? Reset with `docker compose down -v`
 * so this can build the full catalogue cleanly.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Idempotent, additive migrations for catalogues that were seeded by an
 * earlier version. Safe to run on every boot. Add new universal fields here.
 */
async function ensureLateAdditions() {
  // Short Name — added after the initial release
  let shortName = await prisma.attribute.findFirst({ where: { code: 'short_name' } });
  if (!shortName) {
    shortName = await prisma.attribute.create({
      data: { code: 'short_name', label: 'Short Name', dataType: 'text', inputType: 'text', required: true, system: false, source: 'FREE', unit: '' },
    });
    console.log('  + added attribute: Short Name');
  }
  // make sure it appears on every product type (Identification group, else first group)
  const sets = await prisma.attributeSet.findMany({
    include: { groups: { orderBy: { sortOrder: 'asc' }, include: { items: true } } },
  });
  for (const s of sets) {
    const present = s.groups.some((g) => g.items.some((it) => it.attributeId === shortName!.id));
    if (present) continue;
    const target = s.groups.find((g) => g.name === 'Identification') || s.groups[0];
    if (target) {
      await prisma.entityAttribute.create({ data: { groupId: target.id, attributeId: shortName.id, sortOrder: target.items.length } });
      console.log(`  + added Short Name to set "${s.name}"`);
    }
  }

  // seed sensible default routing values for the two built-in sets if none set yet
  const defaults: Record<string, string[]> = {
    MCCB: ['MCCB', 'Low Voltage Switchgears', 'Circuit Breakers'],
    'Wire & Cable': ['Wires & Cables', 'Single Core Cables', 'Cables & Wires'],
  };
  for (const s of sets) {
    if ((!s.familyValues || s.familyValues.length === 0) && defaults[s.name]) {
      await prisma.attributeSet.update({ where: { id: s.id }, data: { familyValues: defaults[s.name] } });
      console.log(`  + set routing values for "${s.name}"`);
    }
  }
}

type AttrSpec = {
  code: string;
  label: string;
  dataType: string;
  inputType: string; // text | number | list
  required?: boolean;
  system?: boolean;
  source?: 'FREE' | 'OPTION' | 'MASTER';
  unit?: string;
  masterKey?: string; // resolved to masterId below
  options?: string[];
};

async function main() {
  if (await prisma.attribute.findFirst({ where: { code: 'price' } })) {
    console.log('Base catalogue already present — ensuring later additions.');
    await ensureLateAdditions();
    return;
  }
  console.log('Seeding full catalogue…');

  // ---- Masters ----------------------------------------------------------
  const brand = await prisma.master.create({
    data: {
      name: 'Item Brand',
      key: 'brand',
      values: {
        create: [
          { label: 'BrandX', hiva: 'BRX', magento: 'BrandX', crm: 'BRX-001', sortOrder: 0 },
          { label: 'BrandY', hiva: 'BRY', magento: 'BrandY', crm: 'BRY-002', sortOrder: 1 },
        ],
      },
    },
    include: { values: true },
  });
  const masterIdByKey: Record<string, string> = { brand: brand.id };

  // ---- Attribute specs --------------------------------------------------
  // The 24 product-creation fields (Code/Long Name/Item Brand map to the
  // built-in system attributes) plus per-product-type technical attributes.
  const specs: AttrSpec[] = [
    // identification
    { code: 'product_code', label: 'Code', dataType: 'text', inputType: 'text', required: true, system: true },
    { code: 'name', label: 'Long Name', dataType: 'text', inputType: 'text', required: true, system: true },
    { code: 'short_name', label: 'Short Name', dataType: 'text', inputType: 'text', required: true },
    { code: 'reference_no', label: 'Reference No', dataType: 'text', inputType: 'text' },
    { code: 'brand', label: 'Item Brand', dataType: 'text', inputType: 'list', required: true, system: true, source: 'MASTER', masterKey: 'brand' },
    { code: 'item_family', label: 'Item Family', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['Circuit Breakers', 'Cables & Wires', 'Switchgear'] },
    { code: 'item_subfamily', label: 'Item SubFamily', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['MCCB', 'MCB', 'RCCB', 'Building Wire', 'Power Cable'] },
    { code: 'item_category', label: 'Item Category', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['MCCB', 'Wire', 'Accessories'] },
    { code: 'item_subcategory', label: 'Item Subcategory', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['250A', '400A', '1.5 sqmm', '2.5 sqmm'] },
    { code: 'product_type', label: 'Product Type', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['Finished Good', 'Raw Material', 'Semi-Finished', 'Service'] },
    // commerce / e-shop
    { code: 'product_availability', label: 'Product Availability', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['In Stock', 'Out of Stock', 'Made to Order', 'Discontinued'] },
    { code: 'visibility', label: 'Visibility', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['Visible', 'Hidden'] },
    { code: 'sync_in_eshop', label: 'Sync in e-shop', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Yes', 'No'] },
    { code: 'magento_sync_status', label: 'Magento Sync Status', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Pending', 'Synced', 'Failed'] },
    { code: 'front_end_unit', label: 'Front End Unit', dataType: 'text', inputType: 'text' },
    { code: 'min_order_qty', label: 'Min Order Qty', dataType: 'number', inputType: 'number', required: true },
    { code: 'price', label: 'Price', dataType: 'number', inputType: 'number', required: true, unit: 'INR' },
    // logistics / inventory
    { code: 'hsn_code', label: 'HSN Code', dataType: 'text', inputType: 'text', required: true },
    { code: 'product_units', label: 'Product Units', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['Nos', 'Mtr', 'Kg', 'Set', 'Box', 'Roll'] },
    { code: 'dispatch_time', label: 'Dispatch Time', dataType: 'number', inputType: 'number', unit: 'days' },
    { code: 'lead_time', label: 'LeadTime', dataType: 'number', inputType: 'number', unit: 'days' },
    { code: 'valuation_method', label: 'Valuation Method', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['FIFO', 'LIFO', 'Weighted Average', 'Standard Cost'] },
    { code: 'batch_active', label: 'Batch Active', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Yes', 'No'] },
    { code: 'reorder_level', label: 'Reorder Level', dataType: 'number', inputType: 'number' },
    { code: 'cap_noncap', label: 'Cap/NonCap', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Capital', 'Non-Capital'] },
    // MCCB technical
    { code: 'poles', label: 'Poles', dataType: 'text', inputType: 'list', required: true, source: 'OPTION', options: ['1P', '2P', '3P', '4P'] },
    { code: 'rated_current', label: 'Rated Current', dataType: 'number', inputType: 'number', unit: 'A' },
    { code: 'breaking_capacity', label: 'Breaking Capacity', dataType: 'number', inputType: 'number', unit: 'kA' },
    { code: 'trip_unit', label: 'Trip Unit', dataType: 'text', inputType: 'text' },
    { code: 'frame_size', label: 'Frame Size', dataType: 'text', inputType: 'text' },
    { code: 'colour', label: 'Colour', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Grey', 'Black', 'White'] },
    // Wire & Cable technical
    { code: 'conductor_material', label: 'Conductor Material', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['Cu', 'Al'] },
    { code: 'cross_section', label: 'Cross Section', dataType: 'number', inputType: 'number', unit: 'sq mm' },
    { code: 'cores', label: 'Cores', dataType: 'number', inputType: 'number' },
    { code: 'insulation', label: 'Insulation', dataType: 'text', inputType: 'list', source: 'OPTION', options: ['PVC', 'XLPE'] },
    { code: 'voltage_grade', label: 'Voltage Grade', dataType: 'text', inputType: 'text' },
    { code: 'length', label: 'Length', dataType: 'number', inputType: 'number', unit: 'm' },
  ];

  const idByCode: Record<string, string> = {};
  for (const s of specs) {
    const a = await prisma.attribute.create({
      data: {
        code: s.code,
        label: s.label,
        dataType: s.dataType,
        inputType: s.inputType,
        required: s.required ?? false,
        system: s.system ?? false,
        source: s.source ?? 'FREE',
        unit: s.unit ?? '',
        masterId: s.masterKey ? masterIdByKey[s.masterKey] : null,
        options: s.options ? { create: s.options.map((label, i) => ({ label, sortOrder: i })) } : undefined,
      },
    });
    idByCode[s.code] = a.id;
  }

  // ---- group helpers ----------------------------------------------------
  const grp = (name: string, codes: string[], sortOrder: number) => ({
    name,
    sortOrder,
    items: { create: codes.map((c, i) => ({ attributeId: idByCode[c], sortOrder: i })) },
  });

  // common product-creation groups shared by every product type
  const commonGroups = (startOrder: number) => [
    grp('Identification', ['product_code', 'short_name', 'name', 'reference_no', 'brand', 'item_family', 'item_subfamily', 'item_category', 'item_subcategory', 'product_type'], startOrder),
    grp('Commerce / e-shop', ['product_availability', 'visibility', 'sync_in_eshop', 'magento_sync_status', 'price', 'front_end_unit', 'min_order_qty'], startOrder + 1),
    grp('Logistics / Inventory', ['hsn_code', 'product_units', 'dispatch_time', 'lead_time', 'valuation_method', 'batch_active', 'reorder_level', 'cap_noncap'], startOrder + 2),
  ];

  // ---- Sets -------------------------------------------------------------
  const mccbSet = await prisma.attributeSet.create({
    data: {
      name: 'MCCB',
      familyValues: ['MCCB', 'Low Voltage Switchgears', 'Circuit Breakers'],
      groups: {
        create: [
          ...commonGroups(0),
          grp('Technical', ['poles', 'rated_current', 'breaking_capacity', 'trip_unit'], 3),
          grp('Dimensions', ['frame_size'], 4),
          grp('Media', ['colour'], 5),
        ],
      },
    },
  });

  await prisma.attributeSet.create({
    data: {
      name: 'Wire & Cable',
      familyValues: ['Wires & Cables', 'Single Core Cables', 'Cables & Wires'],
      groups: {
        create: [
          ...commonGroups(0),
          grp('Technical', ['conductor_material', 'cross_section', 'cores', 'insulation', 'voltage_grade'], 3),
          grp('Dimensions', ['length'], 4),
          grp('Media', ['colour'], 5),
        ],
      },
    },
  });

  // ---- Sample product (MCCB-3P-250) ------------------------------------
  const brandX = brand.values.find((v) => v.label === 'BrandX')!;
  const product = await prisma.product.create({ data: { setId: mccbSet.id } });
  const V = (code: string, targetSystem: 'SHARED' | 'HIVA' | 'MAGENTO' | 'CRM', col: 'valueString' | 'valueNumber', value: any) => ({
    productId: product.id, attributeId: idByCode[code], targetSystem, [col]: value,
  });
  await prisma.productValue.createMany({
    data: [
      V('product_code', 'SHARED', 'valueString', 'MCCB-3P-250'),
      V('name', 'SHARED', 'valueString', '3 Pole 250A MCCB'),
      V('brand', 'SHARED', 'valueString', brandX.id),
      V('item_family', 'SHARED', 'valueString', 'Circuit Breakers'),
      V('item_subfamily', 'SHARED', 'valueString', 'MCCB'),
      V('item_category', 'SHARED', 'valueString', 'MCCB'),
      V('product_type', 'SHARED', 'valueString', 'Finished Good'),
      V('product_availability', 'SHARED', 'valueString', 'In Stock'),
      V('visibility', 'SHARED', 'valueString', 'Visible'),
      V('sync_in_eshop', 'SHARED', 'valueString', 'Yes'),
      V('hsn_code', 'SHARED', 'valueString', '85362000'),
      V('product_units', 'SHARED', 'valueString', 'Nos'),
      V('min_order_qty', 'SHARED', 'valueNumber', 1),
      V('price', 'SHARED', 'valueNumber', 4500),
      // poles with per-system overrides
      V('poles', 'SHARED', 'valueString', '3P'),
      V('poles', 'MAGENTO', 'valueString', '3 Pole'),
      V('poles', 'CRM', 'valueString', 'POLE_3'),
      // colour with per-system overrides
      V('colour', 'SHARED', 'valueString', 'Grey'),
      V('colour', 'HIVA', 'valueString', 'GR'),
      V('colour', 'CRM', 'valueString', 'C-GREY'),
      V('rated_current', 'SHARED', 'valueNumber', 250),
      V('breaking_capacity', 'SHARED', 'valueNumber', 36),
    ],
  });

  console.log(`Seed complete — ${specs.length} attributes, 2 sets, 1 sample product.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
