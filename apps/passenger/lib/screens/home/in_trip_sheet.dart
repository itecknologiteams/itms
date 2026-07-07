import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

/// In-trip (docs/ui-ux.md §3): elapsed time is computed client-side from
/// ride.startedAt — no live distance is shown because no backend gateway
/// pushes live GPS/distance to the passenger during a ride (tracking only
/// derives distance post-ride, for Fare). Documented gap, not faked here.
class InTripSheet extends StatefulWidget {
  final DateTime? startedAt;
  final VoidCallback onSos;

  const InTripSheet({super.key, required this.startedAt, required this.onSos});

  @override
  State<InTripSheet> createState() => _InTripSheetState();
}

class _InTripSheetState extends State<InTripSheet> {
  late final Timer _timer;
  Duration _elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final started = widget.startedAt;
    if (started != null && mounted) {
      setState(() => _elapsed = DateTime.now().toUtc().difference(started.toUtc()));
    }
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _elapsed.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = _elapsed.inSeconds.remainder(60).toString().padLeft(2, '0');
    return GlassPanel(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Trip in progress', style: TextStyle(fontWeight: FontWeight.w600)),
              Text('$minutes:$seconds elapsed'),
            ],
          ),
          IconButton.filled(
            style: IconButton.styleFrom(backgroundColor: AppColors.light.danger),
            onPressed: widget.onSos,
            icon: const Icon(Icons.sos),
            tooltip: 'SOS',
          ),
        ],
      ),
    );
  }
}
