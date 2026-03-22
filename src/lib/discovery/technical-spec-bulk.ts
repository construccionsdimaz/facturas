import type {
  SpaceInstance,
} from './types';
import type {
  TechnicalSpecModel,
  TechnicalSpecPatch,
} from './technical-spec-types';
import {
  createEmptyTechnicalSpecPatch,
  ensureTechnicalSpecPatch,
} from './technical-spec-defaults';

function clonePatch(patch: TechnicalSpecPatch): TechnicalSpecPatch {
  return JSON.parse(JSON.stringify(ensureTechnicalSpecPatch(patch || createEmptyTechnicalSpecPatch())));
}

export function patchHasContent(patch?: TechnicalSpecPatch | null) {
  const safe = ensureTechnicalSpecPatch(patch || createEmptyTechnicalSpecPatch());
  return (
    Object.values(safe.selections || {}).some(Boolean) ||
    Object.values(safe.dimensions || {}).some((value) => typeof value === 'number' && value > 0) ||
    Object.values(safe.counts || {}).some((value) => typeof value === 'number' && value > 0) ||
    Object.values(safe.options || {}).some((value) => value === true)
  );
}

export function applyGroupPatchToAllGroups(
  model: TechnicalSpecModel,
  sourceGroupId: string,
  groupIds: string[]
) {
  const source = clonePatch(model.groupSpecs[sourceGroupId] || createEmptyTechnicalSpecPatch());
  const nextGroupSpecs = { ...model.groupSpecs };
  for (const groupId of groupIds) {
    nextGroupSpecs[groupId] = clonePatch(source);
  }
  return {
    ...model,
    groupSpecs: nextGroupSpecs,
  };
}

export function copyGroupPatchToTargetGroup(
  model: TechnicalSpecModel,
  sourceGroupId: string,
  targetGroupId: string
) {
  const source = clonePatch(model.groupSpecs[sourceGroupId] || createEmptyTechnicalSpecPatch());
  return {
    ...model,
    groupSpecs: {
      ...model.groupSpecs,
      [targetGroupId]: source,
    },
  };
}

export function applyFloorPatchToAllFloors(
  model: TechnicalSpecModel,
  sourceFloorId: string,
  floorIds: string[]
) {
  const source = clonePatch(model.floorSpecs[sourceFloorId] || createEmptyTechnicalSpecPatch());
  const nextFloorSpecs = { ...model.floorSpecs };
  for (const floorId of floorIds) {
    nextFloorSpecs[floorId] = clonePatch(source);
  }
  return {
    ...model,
    floorSpecs: nextFloorSpecs,
  };
}

export function copyFloorPatchToTargetFloor(
  model: TechnicalSpecModel,
  sourceFloorId: string,
  targetFloorId: string
) {
  const source = clonePatch(model.floorSpecs[sourceFloorId] || createEmptyTechnicalSpecPatch());
  return {
    ...model,
    floorSpecs: {
      ...model.floorSpecs,
      [targetFloorId]: source,
    },
  };
}

export function applyInstancePatchToSimilarInstances(
  model: TechnicalSpecModel,
  sourceInstanceId: string,
  instances: SpaceInstance[]
) {
  const sourceInstance = instances.find((instance) => instance.instanceId === sourceInstanceId);
  if (!sourceInstance) return model;

  const source = clonePatch(model.instanceSpecs[sourceInstanceId] || createEmptyTechnicalSpecPatch());
  const nextInstanceSpecs = { ...model.instanceSpecs };
  const similarInstances = instances.filter(
    (instance) =>
      instance.areaType === sourceInstance.areaType &&
      instance.subspaceKind === sourceInstance.subspaceKind
  );

  for (const instance of similarInstances) {
    nextInstanceSpecs[instance.instanceId] = clonePatch(source);
  }

  return {
    ...model,
    instanceSpecs: nextInstanceSpecs,
  };
}

export function resetGroupPatchInheritance(model: TechnicalSpecModel, groupId: string) {
  const nextGroupSpecs = { ...model.groupSpecs };
  delete nextGroupSpecs[groupId];
  return {
    ...model,
    groupSpecs: nextGroupSpecs,
  };
}

export function resetFloorPatchInheritance(model: TechnicalSpecModel, floorId: string) {
  const nextFloorSpecs = { ...model.floorSpecs };
  delete nextFloorSpecs[floorId];
  return {
    ...model,
    floorSpecs: nextFloorSpecs,
  };
}

export function resetInstancePatchInheritance(model: TechnicalSpecModel, instanceId: string) {
  const nextInstanceSpecs = { ...model.instanceSpecs };
  delete nextInstanceSpecs[instanceId];
  return {
    ...model,
    instanceSpecs: nextInstanceSpecs,
  };
}
