type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type SchedulerActivityInput = {
  id: string;
  name: string;
  durationDays?: number | null;
};

export type SchedulerDependencyInput = {
  predecessorId: string;
  successorId: string;
  type?: DependencyType | null;
  lagDays?: number | null;
};

export type ProjectCalendarInput = {
  workingDays?: string | string[] | null;
  workHours?: string | null;
  worksSaturdays?: boolean | null;
  worksHolidays?: boolean | null;
  bufferDays?: number | null;
  timeCriteria?: string | null;
};

export type NormalizedProjectCalendar = {
  workingDays: number[];
  workHours: string;
  worksSaturdays: boolean;
  worksHolidays: boolean;
  bufferDays: number;
  timeCriteria: 'LABORABLES' | 'NATURALES';
  source: 'PROJECT' | 'DEFAULT';
  warnings: string[];
};

export type ScheduledActivity = {
  id: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  plannedDurationDays: number;
  calendarDurationDays: number;
};

export type SchedulingIssue = {
  level: 'warning' | 'error';
  code: string;
  message: string;
  activityId?: string;
  dependencyKey?: string;
};

export type SchedulingResult = {
  activities: ScheduledActivity[];
  issues: SchedulingIssue[];
  order: string[];
  startDate: Date;
  startRule: 'REQUEST_DATE' | 'TODAY';
  calendar: NormalizedProjectCalendar;
  scheduledWith: 'PROJECT_CALENDAR' | 'DEFAULT_CALENDAR';
};

const DAY_NAMES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

export function getDefaultProjectCalendarData() {
  return {
    workingDays: JSON.stringify(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']),
    workHours: '08:00-18:00',
    worksSaturdays: false,
    worksHolidays: false,
    bufferDays: 0,
    timeCriteria: 'LABORABLES',
  };
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addNaturalDays(date: Date, days: number) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseWorkingDays(workingDays: string | string[] | null | undefined, worksSaturdays: boolean, timeCriteria: 'LABORABLES' | 'NATURALES') {
  if (timeCriteria === 'NATURALES') {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  let values: string[] = [];
  if (typeof workingDays === 'string') {
    try {
      const parsed = JSON.parse(workingDays);
      if (Array.isArray(parsed)) values = parsed.filter((value): value is string => typeof value === 'string');
    } catch {
      values = [];
    }
  } else if (Array.isArray(workingDays)) {
    values = workingDays.filter((value): value is string => typeof value === 'string');
  }

  const mapped = values
    .map((value) => DAY_NAMES[value.trim().toLowerCase()])
    .filter((value): value is number => typeof value === 'number');

  const set = new Set<number>(mapped.length > 0 ? mapped : [1, 2, 3, 4, 5]);
  if (worksSaturdays) set.add(6);
  return Array.from(set).sort((a, b) => a - b);
}

export function normalizeProjectCalendar(calendar?: ProjectCalendarInput | null): NormalizedProjectCalendar {
  const fallback = getDefaultProjectCalendarData();
  const source = calendar ? 'PROJECT' : 'DEFAULT';
  const timeCriteria = calendar?.timeCriteria === 'NATURALES' ? 'NATURALES' : 'LABORABLES';
  const worksSaturdays = Boolean(calendar?.worksSaturdays ?? fallback.worksSaturdays);
  const worksHolidays = Boolean(calendar?.worksHolidays ?? fallback.worksHolidays);
  const warnings: string[] = [];

  if (!calendar) {
    warnings.push('La obra no tenia calendario configurado. Se ha aplicado un calendario por defecto controlado.');
  }

  if (!worksHolidays) {
    warnings.push('No existe un catalogo de festivos cargado; el calculo temporal se resuelve con patron semanal y no discrimina festivos reales.');
  }

  return {
    workingDays: parseWorkingDays(calendar?.workingDays ?? fallback.workingDays, worksSaturdays, timeCriteria),
    workHours: calendar?.workHours || fallback.workHours,
    worksSaturdays,
    worksHolidays,
    bufferDays: Math.max(0, Math.round(Number(calendar?.bufferDays ?? fallback.bufferDays) || 0)),
    timeCriteria,
    source,
    warnings,
  };
}

function isWorkingDay(date: Date, calendar: NormalizedProjectCalendar) {
  if (calendar.timeCriteria === 'NATURALES') return true;
  return calendar.workingDays.includes(date.getDay());
}

function alignToWorkingDay(date: Date, calendar: NormalizedProjectCalendar, direction: 1 | -1 = 1) {
  let current = startOfDay(date);
  while (!isWorkingDay(current, calendar)) {
    current = addNaturalDays(current, direction);
  }
  return current;
}

function moveByWorkingDays(date: Date, offset: number, calendar: NormalizedProjectCalendar) {
  let current = startOfDay(date);
  if (offset === 0) return current;

  const direction: 1 | -1 = offset > 0 ? 1 : -1;
  let remaining = Math.abs(offset);

  while (remaining > 0) {
    current = addNaturalDays(current, direction);
    if (isWorkingDay(current, calendar)) remaining -= 1;
  }

  return current;
}

function normalizeDurationDays(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.ceil(value));
}

function normalizeLagDays(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value >= 0 ? Math.ceil(value) : Math.floor(value);
}

function buildDependencyKey(dep: SchedulerDependencyInput) {
  return `${dep.predecessorId}->${dep.successorId}`;
}

export function resolveSchedulingStartDate(explicitStartDate?: string | Date | null) {
  if (explicitStartDate) {
    const date = explicitStartDate instanceof Date ? explicitStartDate : new Date(explicitStartDate);
    if (!Number.isNaN(date.getTime())) {
      return {
        date: startOfDay(date),
        rule: 'REQUEST_DATE' as const,
      };
    }
  }

  return {
    date: startOfDay(new Date()),
    rule: 'TODAY' as const,
  };
}

export function scheduleProjectActivities(input: {
  activities: SchedulerActivityInput[];
  dependencies: SchedulerDependencyInput[];
  calendar?: ProjectCalendarInput | null;
  startDate?: Date | string | null;
  startRule?: 'REQUEST_DATE' | 'TODAY';
}) : SchedulingResult {
  const calendar = normalizeProjectCalendar(input.calendar);
  const baseStart = alignToWorkingDay(resolveSchedulingStartDate(input.startDate).date, calendar, 1);
  const effectiveStart = calendar.bufferDays > 0 ? moveByWorkingDays(baseStart, calendar.bufferDays, calendar) : baseStart;
  const issues: SchedulingIssue[] = calendar.warnings.map((message) => ({
    level: 'warning',
    code: 'CALENDAR_NOTICE',
    message,
  }));

  const activityMap = new Map<string, SchedulerActivityInput>(input.activities.map((activity) => [activity.id, activity]));
  const predecessorMap = new Map<string, SchedulerDependencyInput[]>();
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const activity of input.activities) {
    predecessorMap.set(activity.id, []);
    adjacency.set(activity.id, []);
    indegree.set(activity.id, 0);

    if (typeof activity.durationDays !== 'number' || !Number.isFinite(activity.durationDays) || activity.durationDays <= 0) {
      issues.push({
        level: 'warning',
        code: 'INVALID_DURATION',
        message: `La actividad "${activity.name}" no tenia una duracion valida. Se ha usado 1 dia.`,
        activityId: activity.id,
      });
    } else if (!Number.isInteger(activity.durationDays)) {
      issues.push({
        level: 'warning',
        code: 'FRACTIONAL_DURATION',
        message: `La actividad "${activity.name}" tenia duracion decimal (${activity.durationDays}). Se ha redondeado al alza para calendarizar por dias.`,
        activityId: activity.id,
      });
    }
  }

  for (const dependency of input.dependencies) {
    const predecessor = activityMap.get(dependency.predecessorId);
    const successor = activityMap.get(dependency.successorId);
    if (!predecessor || !successor) {
      issues.push({
        level: 'warning',
        code: 'MISSING_DEPENDENCY_ACTIVITY',
        message: `Se ha ignorado una dependencia porque referencia actividades inexistentes (${dependency.predecessorId} -> ${dependency.successorId}).`,
        dependencyKey: buildDependencyKey(dependency),
      });
      continue;
    }

    predecessorMap.get(successor.id)?.push(dependency);
    adjacency.get(predecessor.id)?.push(successor.id);
    indegree.set(successor.id, (indegree.get(successor.id) || 0) + 1);
  }

  const queue = input.activities
    .map((activity) => activity.id)
    .filter((id) => (indegree.get(id) || 0) === 0);
  const topoOrder: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    for (const successorId of adjacency.get(current) || []) {
      indegree.set(successorId, (indegree.get(successorId) || 0) - 1);
      if ((indegree.get(successorId) || 0) === 0) queue.push(successorId);
    }
  }

  if (topoOrder.length !== input.activities.length) {
    const remaining = input.activities.map((activity) => activity.id).filter((id) => !topoOrder.includes(id));
    issues.push({
      level: 'error',
      code: 'CIRCULAR_DEPENDENCY',
      message: 'Se han detectado dependencias circulares o inconsistentes. Las actividades afectadas se calendarizan en orden de contingencia.',
    });
    topoOrder.push(...remaining);
  }

  const scheduledOffsets = new Map<string, { start: number; finish: number; duration: number }>();

  for (const activityId of topoOrder) {
    const activity = activityMap.get(activityId);
    if (!activity) continue;

    const duration = normalizeDurationDays(activity.durationDays);
    let earliestStart = 0;
    const predecessors = predecessorMap.get(activityId) || [];

    for (const dependency of predecessors) {
      const predecessorSchedule = scheduledOffsets.get(dependency.predecessorId);
      if (!predecessorSchedule) {
        issues.push({
          level: 'warning',
          code: 'UNRESOLVED_PREDECESSOR',
          message: `No se pudo resolver completamente la predecesora de "${activity.name}". La dependencia se ha ignorado para calendarizar esta actividad.`,
          activityId,
          dependencyKey: buildDependencyKey(dependency),
        });
        continue;
      }

      const lag = normalizeLagDays(dependency.lagDays);
      const type = dependency.type || 'FS';
      let candidateStart = predecessorSchedule.finish + 1 + lag;

      switch (type) {
        case 'SS':
          candidateStart = predecessorSchedule.start + lag;
          break;
        case 'FF':
          candidateStart = predecessorSchedule.finish + lag - duration + 1;
          break;
        case 'SF':
          candidateStart = predecessorSchedule.start + lag - duration + 1;
          break;
        case 'FS':
        default:
          candidateStart = predecessorSchedule.finish + 1 + lag;
          break;
      }

      earliestStart = Math.max(earliestStart, candidateStart);
    }

    const startOffset = earliestStart;
    const finishOffset = startOffset + duration - 1;
    scheduledOffsets.set(activityId, {
      start: startOffset,
      finish: finishOffset,
      duration,
    });
  }

  const activities = input.activities.map((activity) => {
    const scheduled = scheduledOffsets.get(activity.id) || { start: 0, finish: 0, duration: 1 };
    return {
      id: activity.id,
      plannedStartDate: moveByWorkingDays(effectiveStart, scheduled.start, calendar),
      plannedEndDate: moveByWorkingDays(effectiveStart, scheduled.finish, calendar),
      plannedDurationDays: scheduled.duration,
      calendarDurationDays: scheduled.duration,
    };
  });

  const isolatedActivities = input.activities.filter((activity) => {
    const predecessors = predecessorMap.get(activity.id) || [];
    const successors = adjacency.get(activity.id) || [];
    return predecessors.length === 0 && successors.length === 0;
  });

  if (isolatedActivities.length > 0) {
    issues.push({
      level: 'warning',
      code: 'ISOLATED_ACTIVITIES',
      message: `Hay ${isolatedActivities.length} actividades huerfanas logicamente. Se han calendarizado desde la fecha base sin dependencias.`,
    });
  }

  return {
    activities,
    issues,
    order: topoOrder,
    startDate: effectiveStart,
    startRule: input.startRule || resolveSchedulingStartDate(input.startDate).rule,
    calendar,
    scheduledWith: calendar.source === 'PROJECT' ? 'PROJECT_CALENDAR' : 'DEFAULT_CALENDAR',
  };
}
