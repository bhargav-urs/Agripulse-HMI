/**
 * Optional connectivity fault injection. Sensor-value "glitches" were removed -
 * readings now follow deterministic physics - so this only models the realistic
 * scenario of a device briefly losing its network link (to demonstrate the HMI's
 * offline handling and DEVICE_DISCONNECTED alert).
 *
 * Random drops are OFF by default; a drop can always be triggered manually with
 * the 'd' key (see deviceSimulator).
 */
export class FaultSimulator {
  constructor(private enabled: boolean) {}

  /** ~0.3% chance per tick to request a short disconnect (only if enabled). */
  shouldRandomlyDisconnect(): boolean {
    return this.enabled && Math.random() < 0.003;
  }

  /** Disconnect duration in ms (3-8s). */
  disconnectDurationMs(): number {
    return 3000 + Math.floor(Math.random() * 5000);
  }
}
