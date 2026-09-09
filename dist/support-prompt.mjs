// Pure state machine. A stored 'shown' flag records a prompt, never a payment.
export class SupportPrompt {
  constructor({matchId, ended = false, shown = false, now = () => performance.now()}) {
    this.matchId = matchId;
    this.ended = !!ended;
    this.shown = shown;
    this.now = now;
    this.pending = null;
  }
  update({matchId, ended, enabled}) {
    if (matchId !== this.matchId) {
      this.matchId = matchId;
      this.shown = false;
      this.ended = false;
      this.pending = null;
    }
    if (!ended || !enabled) this.pending = null;
    if (enabled && ended && !this.ended && !this.shown) this.pending = this.now();
    this.ended = !!ended;
  }
  ready({hidden, modalOpen, busy}) {
    if (this.pending === null || hidden || modalOpen) return false;
    const elapsed = this.now() - this.pending;
    return elapsed >= 1500 && (!busy || elapsed >= 16000);
  }
  markShown() { this.shown = true; this.pending = null; }
}
