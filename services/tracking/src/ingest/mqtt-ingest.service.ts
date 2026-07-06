import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { TRACKING_CONFIG, TrackingConfig } from '../config/configuration';
import { DeviceRegistry } from './device-registry.service';
import { normalize, RawTrackerPayload } from './ping';
import { TrackingService } from './tracking.service';

/**
 * MQTT ingress adapter (docs/api-design.md §4). Subscribes to `<prefix>/+/pos`,
 * resolves the vehicle id, normalizes the payload, and hands it to the pipeline.
 * Kept thin: no business logic lives here.
 */
@Injectable()
export class MqttIngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttIngestService.name);
  private client?: MqttClient;

  constructor(
    @Inject(TRACKING_CONFIG) private readonly config: TrackingConfig,
    private readonly devices: DeviceRegistry,
    private readonly tracking: TrackingService,
  ) {}

  onModuleInit(): void {
    const topic = `${this.config.mqtt.topicPrefix}/+/pos`;
    this.client = mqtt.connect(this.config.mqtt.url, { reconnectPeriod: 5000 });

    this.client.on('connect', () => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) this.logger.error(`MQTT subscribe failed: ${err.message}`);
        else this.logger.log(`Subscribed to MQTT topic "${topic}"`);
      });
    });

    this.client.on('message', (t, payload) => void this.onMessage(t, payload));
    this.client.on('error', (err) => this.logger.error(`MQTT error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await new Promise<void>((resolve) => this.client?.end(false, {}, () => resolve()));
  }

  private async onMessage(topic: string, payload: Buffer): Promise<void> {
    // topic: <prefix>/<id>/pos
    const parts = topic.split('/');
    const topicId = parts[1];
    if (!topicId) return;

    const vehicleId = this.config.mqtt.topicIsVehicleId
      ? topicId
      : this.devices.resolve(topicId);
    if (!vehicleId) {
      this.logger.debug(`Dropping ping from unmapped device ${topicId}`);
      return;
    }

    let raw: RawTrackerPayload;
    try {
      raw = JSON.parse(payload.toString());
    } catch {
      this.logger.warn(`Bad MQTT payload on ${topic}`);
      return;
    }

    const ping = normalize(vehicleId, raw, 'tracker', Date.now());
    if (!ping) return; // invalid fix — silently dropped (counted via metrics later)

    const deviceId = this.config.mqtt.topicIsVehicleId ? undefined : topicId;
    await this.tracking.ingest(ping, deviceId);
  }
}
