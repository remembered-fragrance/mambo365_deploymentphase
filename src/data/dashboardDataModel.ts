export type DashboardErrorSource = 'environment' | 'orders' | 'linked' | 'report';
export type DashboardDataErrors = Partial<Record<DashboardErrorSource, string>>;

export function setDashboardSourceError(
  errors: DashboardDataErrors,
  source: DashboardErrorSource,
  message: string,
): DashboardDataErrors {
  return { ...errors, [source]: message };
}

export function firstDashboardError(errors: DashboardDataErrors): string | null {
  return errors.environment ?? errors.orders ?? errors.linked ?? errors.report ?? null;
}
