import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { RidesDaily } from '../entities/rides-daily.entity';
import { DriverPerformance } from '../entities/driver-performance.entity';
import { ViolationSummary } from '../entities/violation-summary.entity';
import { PaymentMix } from '../entities/payment-mix.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(RidesDaily) private readonly ridesDaily: Repository<RidesDaily>,
    @InjectRepository(DriverPerformance) private readonly driverPerf: Repository<DriverPerformance>,
    @InjectRepository(ViolationSummary) private readonly violations: Repository<ViolationSummary>,
    @InjectRepository(PaymentMix) private readonly paymentMix: Repository<PaymentMix>,
  ) {}

  ridesDailyReport(from: string, to: string) {
    return this.ridesDaily.find({ where: { date: Between(from, to) }, order: { date: 'ASC' } });
  }

  driverPerformanceReport(from: string, to: string) {
    return this.driverPerf.find({ where: { date: Between(from, to) }, order: { date: 'ASC' } });
  }

  violationSummaryReport(from: string, to: string) {
    return this.violations.find({ where: { date: Between(from, to) }, order: { date: 'ASC' } });
  }

  paymentMixReport(from: string, to: string) {
    return this.paymentMix.find({ where: { date: Between(from, to) }, order: { date: 'ASC' } });
  }
}
