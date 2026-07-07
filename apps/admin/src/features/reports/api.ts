import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { driverPerformance, paymentMix, ridesDaily, violationSummary } from '@/lib/mock/store';
import {
  DriverPerformanceRow,
  PaymentMixRow,
  RidesDailyRow,
  ViolationSummaryRow,
} from '@/types/api';

const range = (from: string, to: string) => `?from=${from}&to=${to}`;

export async function getRidesDaily(from: string, to: string): Promise<RidesDailyRow[]> {
  if (MOCK_MODE) {
    await delay();
    return ridesDaily;
  }
  return apiFetch<RidesDailyRow[]>(`/admin/reports/rides_daily${range(from, to)}`);
}

export async function getDriverPerformance(from: string, to: string): Promise<DriverPerformanceRow[]> {
  if (MOCK_MODE) {
    await delay();
    return driverPerformance;
  }
  return apiFetch<DriverPerformanceRow[]>(`/admin/reports/driver_performance${range(from, to)}`);
}

export async function getViolationSummary(from: string, to: string): Promise<ViolationSummaryRow[]> {
  if (MOCK_MODE) {
    await delay();
    return violationSummary;
  }
  return apiFetch<ViolationSummaryRow[]>(`/admin/reports/violations${range(from, to)}`);
}

export async function getPaymentMix(from: string, to: string): Promise<PaymentMixRow[]> {
  if (MOCK_MODE) {
    await delay();
    return paymentMix;
  }
  return apiFetch<PaymentMixRow[]>(`/admin/reports/payment_mix${range(from, to)}`);
}

export function csvExportUrl(report: string, from: string, to: string): string {
  return `/api/v1/admin/reports/${report}${range(from, to)}&format=csv`;
}
