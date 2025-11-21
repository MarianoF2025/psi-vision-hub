"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiLoop = void 0;
class AntiLoop {
    constructor(windowMinutes) {
        this.windowMinutes = windowMinutes;
        this.cache = new Map();
    }
    isWithinWindow(conversationId) {
        const lastTs = this.cache.get(conversationId);
        if (!lastTs)
            return false;
        const diffMinutes = (Date.now() - lastTs) / 60000;
        return diffMinutes < this.windowMinutes;
    }
    touch(conversationId) {
        this.cache.set(conversationId, Date.now());
    }
    cleanup() {
        const now = Date.now();
        for (const [convId, timestamp] of this.cache.entries()) {
            if ((now - timestamp) / 60000 > this.windowMinutes * 2) {
                this.cache.delete(convId);
            }
        }
    }
}
exports.AntiLoop = AntiLoop;
