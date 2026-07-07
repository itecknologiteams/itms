import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DomainRuleError } from '@itms/common';
import { Role, Roles } from '@itms/auth';
import { toCsv } from './csv';
import { ReportsService } from './reports.service';

type ReportName = 'rides_daily' | 'driver_performance' | 'violations' | 'payment_mix';
const VALID_REPORTS: ReportName[] = ['rides_daily', 'driver_performance', 'violations', 'payment_mix'];

@ApiTags('reports')
@Controller({ path: 'admin/reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':report')
  @Roles(Role.AdminOperator, Role.AdminSupervisor, Role.AdminSuper)
  @ApiOperation({ summary: 'Query a report over a date range; ?format=csv for CSV' })
  @ApiParam({ name: 'report', enum: VALID_REPORTS })
  @ApiQuery({ name: 'from', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async get(
    @Param('report') report: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!VALID_REPORTS.includes(report as ReportName)) {
      throw new DomainRuleError('UNKNOWN_REPORT', `Unknown report "${report}"`);
    }
    const rows = await this.fetch(report as ReportName, from, to);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report}.csv"`);
      return toCsv(rows as unknown as Array<Record<string, unknown>>);
    }
    return rows;
  }

  private fetch(report: ReportName, from: string, to: string) {
    switch (report) {
      case 'rides_daily':
        return this.reports.ridesDailyReport(from, to);
      case 'driver_performance':
        return this.reports.driverPerformanceReport(from, to);
      case 'violations':
        return this.reports.violationSummaryReport(from, to);
      case 'payment_mix':
        return this.reports.paymentMixReport(from, to);
    }
  }
}
