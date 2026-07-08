import 'dart:async';
import 'package:flutter/material.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/slide_to_confirm.dart';

/// In-trip (docs/ui-ux.md §4): elapsed time + distance tiles, End Ride slide
/// control. Distance isn't shown — no live GPS feed exists to compute it
/// (tracking only derives distance post-ride, for Fare); showing a number
/// here would have to be fabricated.
class InTripScreen extends StatefulWidget {
  final DateTime? startedAt;
  final Future<void> Function() onEnd;

  const InTripScreen({super.key, required this.startedAt, required this.onEnd});

  @override
  State<InTripScreen> createState() => _InTripScreenState();
}

class _InTripScreenState extends State<InTripScreen> {
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trip in progress', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('$minutes:$seconds elapsed', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 20),
          SlideToConfirm(label: 'Slide to end trip →', onConfirm: widget.onEnd),
        ],
      ),
    );
  }
}
