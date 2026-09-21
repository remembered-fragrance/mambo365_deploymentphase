/** VietMap adapter — tiles/geocode/routing. Không dùng OSM public tiles. */
export interface GeocodeHit {
  lat: number;
  lng: number;
  label: string;
}

export class VietMapAdapter {
  constructor(private readonly apiKey: string | undefined) {}

  enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async geocode(_q: string): Promise<GeocodeHit | null> {
    if (!this.apiKey) return null;
    return null;
  }
}
