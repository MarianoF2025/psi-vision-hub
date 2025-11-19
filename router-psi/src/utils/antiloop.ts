export class AntiLoop {
  private cache = new Map<string, number>();

  constructor(private windowMinutes: number) {}

  public isWithinWindow(conversationId: string): boolean {
    const lastTs = this.cache.get(conversationId);
    if (!lastTs) return false;

    const diffMinutes = (Date.now() - lastTs) / 60000;
    return diffMinutes < this.windowMinutes;
  }

  public touch(conversationId: string) {
    this.cache.set(conversationId, Date.now());
  }

  public cleanup() {
    const now = Date.now();
    for (const [convId, timestamp] of this.cache.entries()) {
      if ((now - timestamp) / 60000 > this.windowMinutes * 2) {
        this.cache.delete(convId);
      }
    }
  }
}
