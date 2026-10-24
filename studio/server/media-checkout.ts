// Reuse a private, short-lived read-only Git checkout across concurrent requests.
// Leases prevent refresh/expiry cleanup from removing files still being read.
export class MediaCheckout<T> {
  private current?: { promise: Promise<T>; expires: number; readers: number; retired: boolean; disposed: boolean; timer?: ReturnType<typeof setTimeout> };
  constructor(private create: () => Promise<T>, private dispose: (value: T) => Promise<void>, private ttl = 60_000) {}
  async use<R>(operation: (value: T) => Promise<R>, refresh = false): Promise<R> {
    let entry = this.current;
    if (!entry || refresh || entry.expires <= Date.now()) {
      if (entry) this.retire(entry);
      entry = { promise: this.create(), expires: Date.now() + this.ttl, readers: 0, retired: false, disposed: false };
      this.current = entry;
      const active = entry;
      entry.timer = setTimeout(() => this.retire(active), this.ttl); entry.timer.unref?.();
    }
    entry.readers++;
    try { return await operation(await entry.promise); }
    catch (error) { this.retire(entry); throw error; }
    finally { entry.readers--; this.clean(entry); }
  }
  clear() { if (this.current) this.retire(this.current); }
  private retire(entry: NonNullable<MediaCheckout<T>['current']>) {
    if (this.current === entry) this.current = undefined;
    entry.retired = true; clearTimeout(entry.timer); this.clean(entry);
  }
  private clean(entry: NonNullable<MediaCheckout<T>['current']>) {
    if (!entry.retired || entry.readers || entry.disposed) return;
    entry.disposed = true;
    void entry.promise.then(value => this.dispose(value)).catch(() => { /* Failed clones clean themselves up. */ });
  }
}
