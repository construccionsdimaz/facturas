import { db } from '@/lib/db';
import { ensureAutomationMasters } from '@/lib/automation/masters';

const PROCUREMENT_SEED_KEY = 'procurement-masters';
const PROCUREMENT_SEED_VERSION = 2;

const MATERIAL_SEEDS = [
  { code: 'RES-CONT-08', name: 'Contenedor de escombros 8m3', category: 'RESIDUOS', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Contenedor, retirada y gestion de residuos de obra' },
  { code: 'PLA-STD-13', name: 'Placa de pladur 13 mm', category: 'ALBANILERIA', baseUnit: 'm2', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Placa de yeso laminado estandar para trasdosados y tabiques' },
  { code: 'PER-48', name: 'Perfileria galvanizada 48/70', category: 'ALBANILERIA', baseUnit: 'ml', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Perfileria metalica para sistemas de pladur' },
  { code: 'ELE-CAB-325', name: 'Cable electrico 3x2.5', category: 'INSTALACIONES', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Cableado electrico general' },
  { code: 'ELE-MEC', name: 'Mecanismo electrico', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Mecanismos de interruptor, enchufe y acabados' },
  { code: 'FON-TUB-PPR', name: 'Tubo PPR fontaneria', category: 'INSTALACIONES', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Tuberia para distribucion interior' },
  { code: 'ACA-PORC', name: 'Pavimento porcelanico', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Pavimento porcelanico interior' },
  { code: 'PIN-PLA', name: 'Pintura plastica interior', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Pintura plastica para paredes y techos' },
  { code: 'PIN-PLA-PLUS', name: 'Pintura plastica premium interior', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Pintura interior mejorada para paredes' },
  { code: 'ACA-WALL-STD', name: 'Revestimiento vertical ceramico estandar', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Alicatado ceramico estandar para zonas humedas' },
  { code: 'ACA-WALL-PLUS', name: 'Revestimiento vertical ceramico plus', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Alicatado ceramico mejorado para zonas humedas' },
  { code: 'ACA-WALL-WET-STD', name: 'Alicatado humedo parcial', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Alicatado humedo parcial para banos y cocinas' },
  { code: 'ACA-WALL-WET-PLUS', name: 'Alicatado humedo completo', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Alicatado humedo completo para banos y cocinas' },
  { code: 'IMP-LIQ-STD', name: 'Impermeabilizacion liquida estandar', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Impermeabilizacion ligera de zonas humedas' },
  { code: 'IMP-LIQ-PLUS', name: 'Impermeabilizacion liquida reforzada', category: 'ACABADOS', baseUnit: 'm2', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Impermeabilizacion reforzada de zonas humedas' },
  { code: 'CAR-PUE-L', name: 'Puerta lisa lacada', category: 'CARPINTERIA', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Puerta de paso interior lacada' },
  { code: 'INS-SAN-STD', name: 'Sanitario estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Inodoro, lavabo o pieza sanitaria estandar' },
  { code: 'SAN-SHOWER-TRAY-STD', name: 'Plato de ducha estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Plato de ducha acrilico o resina basico' },
  { code: 'SAN-BATHTUB-STD', name: 'Banera basica', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Banera basica de acero o resina' },
  { code: 'SAN-SCREEN-STD', name: 'Mampara estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Mampara frontal o angular basica' },
  { code: 'SAN-VANITY-STD', name: 'Mueble lavabo estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Mueble de lavabo con encimera o seno' },
  { code: 'SAN-TAP-STD', name: 'Griferia bano estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: true, description: 'Juego basico de griferia para bano' },
  { code: 'SAN-TAP-PLUS', name: 'Griferia bano plus', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: true, description: 'Juego mejorado de griferia para bano' },
  { code: 'KIT-CAB-LOW-STD', name: 'Mueble bajo cocina estandar', category: 'CARPINTERIA', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Modulo bajo de cocina estandar' },
  { code: 'KIT-CAB-HIGH-STD', name: 'Mueble alto cocina estandar', category: 'CARPINTERIA', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Modulo alto de cocina estandar' },
  { code: 'KIT-CTOP-STD', name: 'Encimera cocina estandar', category: 'ACABADOS', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Encimera laminada o cuarzo basico' },
  { code: 'KIT-CTOP-PLUS', name: 'Encimera cocina mejorada', category: 'ACABADOS', baseUnit: 'ml', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Encimera porcelanica o cuarzo mejorado' },
  { code: 'KIT-APP-BASIC', name: 'Pack electrodomesticos basico', category: 'EQUIPAMIENTO', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: true, description: 'Pack basico de campana, placa y micro/horno' },
  { code: 'KIT-SINK-STD', name: 'Fregadero cocina estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: true, description: 'Fregadero inox basico' },
  { code: 'KIT-TAP-STD', name: 'Griferia cocina estandar', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: true, description: 'Griferia basica monomando para cocina' },
  { code: 'FON-WET-STD', name: 'Kit fontaneria zona humeda estandar', category: 'INSTALACIONES', baseUnit: 'pt', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Materiales de fontaneria para punto humedo estandar' },
  { code: 'FON-WET-PLUS', name: 'Kit fontaneria zona humeda reforzada', category: 'INSTALACIONES', baseUnit: 'pt', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Materiales de fontaneria para punto humedo reforzado' },
  { code: 'SAN-WET-STD', name: 'Kit saneamiento zona humeda estandar', category: 'INSTALACIONES', baseUnit: 'pt', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Materiales de saneamiento para punto humedo estandar' },
  { code: 'SAN-WET-PLUS', name: 'Kit saneamiento zona humeda reforzado', category: 'INSTALACIONES', baseUnit: 'pt', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Materiales de saneamiento para punto humedo reforzado' },
  { code: 'ELE-MECH-STD', name: 'Mecanismo electrico premium', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: false, requiresSpecificSupplier: false, description: 'Mecanismos electricos estandar mejor ligados a catalogo' },
  { code: 'ELE-PANEL-BASIC', name: 'Cuadro electrico basico', category: 'INSTALACIONES', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: false, description: 'Cuadro electrico basico de vivienda o unidad' },
  { code: 'CARP-DOOR-SLI', name: 'Puerta corredera interior', category: 'CARPINTERIA', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Puerta corredera interior completa' },
  { code: 'CARP-DOOR-RF', name: 'Puerta RF basica', category: 'CARPINTERIA', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Puerta RF basica homologada' },
  { code: 'WIN-THERM-PLUS', name: 'Ventana termica plus', category: 'CARPINTERIA', baseUnit: 'ud', isCriticalForSchedule: true, requiresSpecificSupplier: true, description: 'Ventana con mejores prestaciones termicas' },
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
  { supplier: 'Acabats Mediterrani', material: 'PIN-PLA-PLUS', unitCost: 5.15, unit: 'm2', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'ACA-WALL-STD', unitCost: 18.2, unit: 'm2', leadTimeDays: 6, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'ACA-WALL-PLUS', unitCost: 24.4, unit: 'm2', leadTimeDays: 7, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'ACA-WALL-WET-STD', unitCost: 20.8, unit: 'm2', leadTimeDays: 7, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'ACA-WALL-WET-PLUS', unitCost: 27.1, unit: 'm2', leadTimeDays: 8, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'IMP-LIQ-STD', unitCost: 7.4, unit: 'm2', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'IMP-LIQ-PLUS', unitCost: 10.5, unit: 'm2', leadTimeDays: 4, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'INS-SAN-STD', unitCost: 138, unit: 'ud', leadTimeDays: 5, isPreferred: false },
  { supplier: 'Acabats Mediterrani', material: 'SAN-SHOWER-TRAY-STD', unitCost: 118, unit: 'ud', leadTimeDays: 5, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'SAN-BATHTUB-STD', unitCost: 205, unit: 'ud', leadTimeDays: 7, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'SAN-SCREEN-STD', unitCost: 172, unit: 'ud', leadTimeDays: 6, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'SAN-VANITY-STD', unitCost: 232, unit: 'ud', leadTimeDays: 7, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'SAN-TAP-STD', unitCost: 86, unit: 'ud', leadTimeDays: 4, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'SAN-TAP-PLUS', unitCost: 132, unit: 'ud', leadTimeDays: 5, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'KIT-CTOP-STD', unitCost: 41, unit: 'ml', leadTimeDays: 5, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'KIT-CTOP-PLUS', unitCost: 66, unit: 'ml', leadTimeDays: 7, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'KIT-SINK-STD', unitCost: 88, unit: 'ud', leadTimeDays: 4, isPreferred: true },
  { supplier: 'Acabats Mediterrani', material: 'KIT-TAP-STD', unitCost: 71, unit: 'ud', leadTimeDays: 4, isPreferred: true },
  { supplier: 'Electro BCN', material: 'ELE-MECH-STD', unitCost: 12.4, unit: 'ud', leadTimeDays: 2, isPreferred: true },
  { supplier: 'Electro BCN', material: 'ELE-PANEL-BASIC', unitCost: 132, unit: 'ud', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Electro BCN', material: 'KIT-APP-BASIC', unitCost: 455, unit: 'ud', leadTimeDays: 5, isPreferred: true },
  { supplier: 'Electro BCN', material: 'FON-WET-STD', unitCost: 33, unit: 'pt', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Electro BCN', material: 'FON-WET-PLUS', unitCost: 43, unit: 'pt', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Electro BCN', material: 'SAN-WET-STD', unitCost: 28, unit: 'pt', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Electro BCN', material: 'SAN-WET-PLUS', unitCost: 36, unit: 'pt', leadTimeDays: 3, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'CAR-PUE-L', unitCost: 145, unit: 'ud', leadTimeDays: 12, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'INS-SAN-STD', unitCost: 142, unit: 'ud', leadTimeDays: 6, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'KIT-CAB-LOW-STD', unitCost: 116, unit: 'ml', leadTimeDays: 9, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'KIT-CAB-HIGH-STD', unitCost: 94, unit: 'ml', leadTimeDays: 9, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'CARP-DOOR-SLI', unitCost: 278, unit: 'ud', leadTimeDays: 11, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'CARP-DOOR-RF', unitCost: 358, unit: 'ud', leadTimeDays: 12, isPreferred: true },
  { supplier: 'Puertas y Obras BCN', material: 'WIN-THERM-PLUS', unitCost: 528, unit: 'ud', leadTimeDays: 13, isPreferred: true },
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
