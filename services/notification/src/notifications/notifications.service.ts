import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundError } from '@itms/common';
import { createEnvelope, EventBusService, EventNames } from '@itms/events';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { renderTemplate } from '../domain/template-renderer';
import { Channel, Lang, Template } from '../entities/template.entity';
import { NotificationRecord, NotificationStatus } from '../entities/notification.entity';
import { PUSH_PROVIDER, PushProvider, SMS_PROVIDER, SmsProvider } from '../providers/provider.interface';

/**
 * Renders a template and dispatches it via the appropriate provider, logging
 * every attempt (docs/specs.md §10; data-model.md · 10 notif_db).
 *
 * Recipient resolution note: this service takes an `authUserId` and a
 * `destination` (device token or phone) directly — it does not resolve those
 * itself. Per database-per-service, Notification cannot read Passenger/Driver's
 * domain ids or Auth's device tokens; the calling service (which already knows
 * its own authUserId per docs/data-model.md) resolves the recipient and calls
 * this API. See README for the full rationale and the integration follow-up.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Template) private readonly templates: Repository<Template>,
    @InjectRepository(NotificationRecord) private readonly records: Repository<NotificationRecord>,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly bus: EventBusService,
  ) {}

  async notify(
    authUserId: string,
    templateKey: string,
    channel: Channel,
    lang: Lang,
    variables: Record<string, unknown>,
    destination: string,
  ): Promise<NotificationRecord> {
    const template = await this.resolveTemplate(templateKey, channel, lang);
    const { text, missingVariables } = renderTemplate(template.body, variables);
    if (missingVariables.length > 0) {
      this.logger.warn(`Template "${templateKey}" missing variables: ${missingVariables.join(', ')}`);
    }
    const title = template.title ? renderTemplate(template.title, variables).text : undefined;

    const record = await this.records.save(
      this.records.create({
        id: uuidv7(),
        userId: authUserId,
        channel: template.channel,
        templateKey,
        payload: { variables, rendered: text },
        status: NotificationStatus.Queued,
        providerRef: null,
      }),
    );

    const result =
      template.channel === Channel.Push
        ? await this.push.send(destination, title ?? templateKey, text)
        : await this.sms.send(destination, text);

    record.status = result.ok ? NotificationStatus.Sent : NotificationStatus.Failed;
    record.providerRef = result.providerRef ?? null;
    await this.records.save(record);

    await this.bus.publish(
      createEnvelope({
        eventName: result.ok ? EventNames.NotificationSent : EventNames.NotificationFailed,
        producer: 'notification',
        payload: { notification_id: record.id, channel: template.channel, user_id: authUserId },
      }),
    );

    return record;
  }

  private async resolveTemplate(key: string, channel: Channel, lang: Lang): Promise<Template> {
    const template = await this.templates.findOne({ where: { key, channel, lang } });
    if (template) return template;

    // Fall back to English if the requested language isn't authored yet.
    const fallback = await this.templates.findOne({
      where: { key, channel, lang: Lang.English },
    });
    if (!fallback) throw new NotFoundError('TEMPLATE_NOT_FOUND', `No template for "${key}"/"${channel}"`);
    return fallback;
  }
}
