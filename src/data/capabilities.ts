/** Endpoints unavailable in the installed backend SDK. */
export const backendCapabilities = {
  deleteAccount: false,
  updateProfile: false,
} as const;

export class FeatureUnavailableError extends Error {
  readonly code = 'FEATURE_UNAVAILABLE';
  constructor(feature: string) {
    super(`${feature}: chưa khả dụng trên backend hiện tại`);
    this.name = 'FeatureUnavailableError';
  }
}
