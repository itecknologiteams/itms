import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, EventEnvelope } from '@itms/events';

/**
 * Maps tracker device ids → vehicle ids, learned from `vehicle.updated` events
 * emitted by the Driver service at onboarding. Trackers publish under their device
 * id (docs/api-design.md §4); the pipeline works in vehicle ids.
 */
@Injectable()
export class DeviceRegistry implements OnModuleInit {
  private readonly deviceToVehicle = new Map<string, string>();

  constructor(private readonly bus: EventBusService) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe(['vehicle.updated'], (env) => this.onVehicleUpdated(env));
  }

  private async onVehicleUpdated(env: EventEnvelope): Promise<void> {
    const p = env.payload as { vehicle_id?: string; tracker_device_id?: string };
    if (p.vehicle_id && p.tracker_device_id) {
      this.deviceToVehicle.set(p.tracker_device_id, p.vehicle_id);
    }
  }

  resolve(deviceId: string): string | null {
    return this.deviceToVehicle.get(deviceId) ?? null;
  }

  register(deviceId: string, vehicleId: string): void {
    this.deviceToVehicle.set(deviceId, vehicleId);
  }
}
