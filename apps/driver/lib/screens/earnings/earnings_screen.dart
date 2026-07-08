import 'package:flutter/material.dart';

/// Earnings / ride history (docs/ui-ux.md §4). No backend endpoint exists
/// for a driver to list their own past rides or earnings — Ride's driver-role
/// routes are all mutation-only (accept/arrived/start/end/...), and
/// Admin-Reporting's driver_performance report is admin-only. Real gap,
/// not faked with mock data.
class EarningsScreen extends StatelessWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: const Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          "There's no backend endpoint yet for a driver to see their own "
          "past rides or earnings totals — only admin reporting can see "
          "aggregate performance today. This screen is a placeholder until "
          "that API exists.",
        ),
      ),
    );
  }
}
