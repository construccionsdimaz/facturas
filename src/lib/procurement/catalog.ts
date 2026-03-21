import { db } from '@/lib/db';
import { ensureAutomationMasters } from '@/lib/automation/masters';

const PROCUREMENT_SEED_KEY = 'procurement-masters';
const PROCUREMENT_SEED_VERSION = 1;

const MATERIAL_SEEDS = [
  { code: 'RES-CONT-08', name: 'Contenedor de escombros 8m3', category: 'RESIDUOS', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Contenedor, retirada y gestion de residuos de obra' },
  { code: 'PLA-STD-13', name: 'Placa de pladur 13 mm', category: 'ALBANILERIA', baseUnit: 'm2', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Placa de yeso laminado estandar para trasdosados y tabiques' },
  { code: 'PER-48', name: 'Perfileria galvanizada 48/70', category: 'ALBANILERIA', baseUnit: 'ml', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Perfileria metalica para sistemas de pladur' },
  { code: 'ELE-CAB-325', name: 'Cable electrico 3x2.5', category: 'INSTALACIONES', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Cableado electrico general' },
  { code: 'ELE-MEC', name: 'Mecanismo electrico', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Mecanismos de interruptor, enchufe y acabados' },
  { code: 'FON-TUB-PPR', name: 'Tubo PPR fontaneria', category: 'INSTALACIONES', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Tuberia para distribucion interior' },
  { code: 'ACA-PORC', name: 'Pavimento porcelanico', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Pavimento porcelanico interior' },
  { code: 'PIN-PLA', name: 'Pintura plastica interior', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Pintura plastica para paredes y techos' },
  { code: 'CAR-PUE-L', name: 'Puerta lisa lacada', category: 'CARPINTERIA', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Puerta de paso interior lacada' },
  { code: 'INS-SAN-STD', name: 'Sanitario estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Inodoro, lavabo o pieza sanitaria estandar' },
];

const SUPPLIER_SEEDS = [
  { name: 'Suministros Dimaz Base', email: 'compras@dimaz-base.local', category: 'PROVEEDOR', address: 'Barcelona', phone: '930000001' },
  { name: 'Electro BCN', email: 'pedidos@electrobcn.local', category: 'PROVEEDOR', address: 'Barcelona', phone: '930000002' },
  { name: 'Acabats Mediterrani', email: 'ventas@acabatsmed.local', category: 'PROVEEDOR', address: 'Badalona', phone: '930000003' },
  { name: 'Puertas y Obras BCN', email: 'ofertas@puertasobras.local', category: 'PROVEEDOR', address: 'Hospitalet', phone: '930000004' },
];

const OFFER_SEEDS = [
  { supplier: 'Suministros Dimaz Base', material: 'RES-CONT-08', unitCost: 180, unit: 'ud', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Suministros Dimaz Base', material: 'PLA-STD-13', unitCost: 6.9, unit: 'm2', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Suministros Dimaz Base', material: 'PER-48', unitCost: 2.4, unit: 'ml', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Suministros Dimaz Base', material: 'ACA-PORC', unitCost: 18.5, unit: 'm2', leadTimeDays: 6, isPreferred: false },
  { supplier: 'Electro BCN', material: 'ELE-CAB-325', unitCost: 1.85, unit: 'ml', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Electro BCN', material: 'ELE-MEC', unitCost: 7.8, unit: 'ud', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Electro BCN', material: 'FON-TUB-PPR', unitCost: 3.2, unit: 'ml', leadTimeDays: 3, isPreferred: false },
  { supplier: 'Acabats Mediterrani', material: 'ACA-PORC', unitCost: 16.9, unit: 'm2', leadTimeDays: 8, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'PIN-PLA', unitCost: 3.9, unit: 'm2', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'INS-SAN-STD', unitCost: 138, unit: 'ud', leadTimeDays: 5, isPreferred: false },
  { supplier: 'Puertas y Obras BCN', material: 'CAR-PUE-L', unitCost: 145, unit: 'ud', leadTimeDays: 12, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'INS-SAN-STD', unitCost: 142, unit: 'ud', leadTimeDays: 6, isPreferred: true },
];

const COST_ITEM_MATERIAL_SEEDS = [
  { costItemCode: 'DEMOLICION', material: 'RES-CONT-08', unit: 'ud', wasteFactor: 0, criticality: 'CRITICA', consumptionRule: { base: 0, factor: 0.08, source: 'lineQuantity', minimum: 1 } },
  { costItemCode: 'RESIDUOS', material: 'RES-CONT-08', unit: 'ud', wasteFactor: 0, criticality: 'CRITICA', consumptionRule: { base: 0, factor: 0.35, source: 'lineQuantity', minimum: 1 } },
  { costItemCode: 'ALBANILERIA', material: 'PLA-STD-13', unit: 'm2', wasteFactor: 0.08, criticality: 'ALTA', consumptionRule: { base: 0, factor: 1, source: 'lineQuantity' } },
  { costItemCode: 'ALBANILERIA', material: 'PER-48', unit: 'ml', wasteFactor: 0.05, criticality: 'ALTA', consumptionRule: { base: 0, factor: 2.4, source: 'lineQuantity' } },
  { costItemCode: 'INSTALACIONES', material: 'ELE-CAB-325', unit: 'ml', wasteFactor: 0.07, criticality: 'CRITICA', consumptionRule: { base: 0, factor: 1.8, source: 'lineQuantity' } },
  { costItemCode: 'INSTALACIONES', material: 'ELE-MEC', unit: 'ud', wasteFactor: 0.03, criticality: 'ALTA', consumptionRule: { base: 0, factor: 0.45, source: 'lineQuantity' } },
  { costItemCode: 'INSTALACIONES', material: 'FON-TUB-PPR', unit: 'ml', wasteFactor: 0.06, criticality: 'ALTA', consumptionRule: { base: 0, factor: 0.9, source: 'lineQuantity' } },
  { costItemCode: 'PAVIMENTOS', material: 'ACA-PORC', unit: 'm2', wasteFactor: 0.1, criticality: 'CRITICA', consumptionRule: { base: 0, factor: 1, source: 'lineQuantity' } },
  { costItemCode: 'PINTURA', material: 'PIN-PLA', unit: 'm2', wasteFactor: 0.05, criticality: 'NORMAL', consumptionRule: { base: 0, factor: 1, source: 'lineQuantity' } },
  { costItemCode: 'CARPINTERIA', material: 'CAR-PUE-L', unit: 'ud', wasteFactor: 0.02, criticality: 'CRITICA', consumptionRule: { base: 0, factor: 1, source: 'lineQuantity' } },
  { costItemCode: 'ALICATADOS', material: 'INS-SAN-STD', unit: 'ud', wasteFactor: 0, criticality: 'ALTA', consumptionRule: { base: 0, factor: 0.12, source: 'lineQuantity', minimum: 1 } },
];

const ACTIVITY_MATERIAL_SEEDS = [
  { standardActivityCode: 'DEM-RET', material: 'RES-CONT-08', unit: 'ud', criticality: 'CRITICA', consumptionRule: { base: 1, factor: 0.05, source: 'durationDays' } },
  { standardActivityCode: 'ALB-INT', material: 'PLA-STD-13', unit: 'm2', criticality: 'ALTA', consumptionRule: { base: 0, factor: 12, source: 'durationDays' } },
  { standardActivityCode: 'ALB-INT', material: 'PER-48', unit: 'ml', criticality: 'ALTA', consumptionRule: { base: 0, factor: 18, source: 'durationDays' } },
  { standardActivityCode: 'INS-GEN', material: 'ELE-CAB-325', unit: 'ml', criticality: 'CRITICA', consumptionRule: { base: 0, factor: 15, source: 'durationDays' } },
  { standardActivityCode: 'INS-GEN', material: 'ELE-MEC', unit: 'ud', criticality: 'ALTA', consumptionRule: { base: 0, factor: 4, source: 'durationDays' } },
  { standardActivityCode: 'ACA-GEN', material: 'ACA-PORC', unit: 'm2', criticality: 'CRITICA', consumptionRule: { base: 0, factor: 8, source: 'durationDays' } },
  { standardActivityCode: 'ACA-GEN', material: 'PIN-PLA', unit: 'm2', criticality: 'NORMAL', consumptionRule: { base: 0, factor: 10, source: 'durationDays' } },
  { standardActivityCode: 'CAR-REM', material: 'CAR-PUE-L', unit: 'ud', criticality: 'CRITICA', consumptionRule: { base: 0, factor: 0.4, source: 'durationDays', minimum: 1 } },
];

export async function ensureProcurementCatalog() {
  await ensureAutomationMasters();

  const state = await (db as any).automationSeedState.findUnique({
    where: { key: PROCUREMENT_SEED_KEY },
  }).catch(() => null);

  const integrity = await validateProcurementIntegrity();
  if (state?.version === PROCUREMENT_SEED_VERSION && integrity.valid) return;

  await (db as any).$transaction(async (tx: any) => {
    let user = await tx.user.findFirst();
    if (!user) {
      user = await tx.user.create({
        data: { email: 'admin@dimaz.es', name: 'Admin', role: 'ADMIN' },
      });
    }

    for (const seed of MATERIAL_SEEDS) {
      await tx.material.upsert({
        where: { code: seed.code },
        update: {
          name: seed.name,
          category: seed.category,
          baseUnit: seed.baseUnit,
          description: seed.description,
          status: 'ACTIVO',
          isCriticalForSchedule: seed.isCriticalForSchedule,
          requiresSpecificSupplier: seed.requiresSpecificSupplier,
        },
        create: {
          code: seed.code,
          name: seed.name,
          category: seed.category,
          baseUnit: seed.baseUnit,
          description: seed.description,
          status: 'ACTIVO',
          isCriticalForSchedule: seed.isCriticalForSchedule,
          requiresSpecificSupplier: seed.requiresSpecificSupplier,
        },
      });
    }

    const materialMap = new Map<string, string>(
      (await tx.material.findMany({
        where: { code: { in: MATERIAL_SEEDS.map((seed) => seed.code) } },
        select: { id: true, code: true },
      })).map((item: { id: string; code: string }) => [item.code, item.id])
    );

    for (const seed of SUPPLIER_SEEDS) {
      const existing = await tx.client.findFirst({
        where: { name: seed.name, category: 'PROVEEDOR' },
      });

      if (existing) {
        await tx.client.update({
          where: { id: existing.id },
          data: {
            email: seed.email,
            address: seed.address,
            phone: seed.phone,
          },
        });
      } else {
        await tx.client.create({
          data: {
            name: seed.name,
            email: seed.email,
            address: seed.address,
            phone: seed.phone,
            category: 'PROVEEDOR',
            userId: user.id,
          },
        });
      }
    }

    const supplierMap = new Map<string, string>(
      (await tx.client.findMany({
        where: { name: { in: SUPPLIER_SEEDS.map((seed) => seed.name) }, category: 'PROVEEDOR' },
        select: { id: true, name: true },
      })).map((item: { id: string; name: string }) => [item.name, item.id])
    );

    for (const seed of OFFER_SEEDS) {
      const supplierId = supplierMap.get(seed.supplier);
      const materialId = materialMap.get(seed.material);
      if (!supplierId || !materialId) continue;

      const existing = await tx.supplierMaterialOffer.findFirst({
        where: {
          supplierId,
          materialId,
          unit: seed.unit,
          status: 'ACTIVA',
        },
      });

      if (existing) {
        await tx.supplierMaterialOffer.update({
          where: { id: existing.id },
          data: {
            unitCost: seed.unitCost,
            currency: 'EUR',
            leadTimeDays: seed.leadTimeDays,
            isPreferred: seed.isPreferred,
            status: 'ACTIVA',
          },
        });
      } else {
        await tx.supplierMaterialOffer.create({
          data: {
            supplierId,
            materialId,
            unitCost: seed.unitCost,
            currency: 'EUR',
            unit: seed.unit,
            leadTimeDays: seed.leadTimeDays,
            isPreferred: seed.isPreferred,
            status: 'ACTIVA',
          },
        });
      }
    }

    const costItems = await tx.typologyCostItem.findMany({
      select: { id: true, code: true },
    });
    const costItemMap = new Map<string, string>(costItems.map((item: { id: string; code: string }) => [item.code, item.id]));

    for (const seed of COST_ITEM_MATERIAL_SEEDS) {
      const costItemId = costItemMap.get(seed.costItemCode);
      const materialId = materialMap.get(seed.material);
      if (!costItemId || !materialId) continue;

      await tx.typologyCostItemMaterial.upsert({
        where: {
          costItemId_materialId: {
            costItemId,
            materialId,
          },
        },
        update: {
          consumptionRule: seed.consumptionRule,
          unit: seed.unit,
          wasteFactor: seed.wasteFactor,
          criticality: seed.criticality,
        },
        create: {
          costItemId,
          materialId,
          consumptionRule: seed.consumptionRule,
          unit: seed.unit,
          wasteFactor: seed.wasteFactor,
          criticality: seed.criticality,
        },
      });
    }

    const activities = await tx.standardActivity.findMany({
      select: { id: true, code: true },
    });
    const activityMap = new Map<string, string>(activities.map((item: { id: string; code: string | null }) => [item.code || '', item.id]));

    for (const seed of ACTIVITY_MATERIAL_SEEDS) {
      const standardActivityId = activityMap.get(seed.standardActivityCode);
      const materialId = materialMap.get(seed.material);
      if (!standardActivityId || !materialId) continue;

      await tx.standardActivityMaterial.upsert({
        where: {
          standardActivityId_materialId: {
            standardActivityId,
            materialId,
          },
        },
        update: {
          consumptionRule: seed.consumptionRule,
          unit: seed.unit,
          criticality: seed.criticality,
        },
        create: {
          standardActivityId,
          materialId,
          consumptionRule: seed.consumptionRule,
          unit: seed.unit,
          criticality: seed.criticality,
        },
      });
    }

    const finalIntegrity = await validateProcurementIntegrity(tx);

    await tx.automationSeedState.upsert({
      where: { key: PROCUREMENT_SEED_KEY },
      update: {
        version: PROCUREMENT_SEED_VERSION,
        status: finalIntegrity.valid ? 'OK' : 'INCOMPLETE',
        seededAt: new Date(),
        details: finalIntegrity.snapshot,
      },
      create: {
        key: PROCUREMENT_SEED_KEY,
        version: PROCUREMENT_SEED_VERSION,
        status: finalIntegrity.valid ? 'OK' : 'INCOMPLETE',
        seededAt: new Date(),
        details: finalIntegrity.snapshot,
      },
    });
  });
}

async function validateProcurementIntegrity(client: any = db) {
  const [materials, offers, itemLinks, activityLinks] = await Promise.all([
    client.material.count({
      where: { code: { in: MATERIAL_SEEDS.map((seed) => seed.code) } },
    }),
    client.supplierMaterialOffer.count({
      where: { status: 'ACTIVA' },
    }),
    client.typologyCostItemMaterial.count(),
    client.standardActivityMaterial.count(),
  ]);

  return {
    valid: materials >= MATERIAL_SEEDS.length && offers >= OFFER_SEEDS.length && itemLinks >= COST_ITEM_MATERIAL_SEEDS.length && activityLinks >= ACTIVITY_MATERIAL_SEEDS.length,
    snapshot: {
      seedVersion: PROCUREMENT_SEED_VERSION,
      materials,
      offers,
      itemLinks,
      activityLinks,
    },
  };
}
