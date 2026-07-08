import 'package:flutter/material.dart';
import '../../models/ride.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/slide_to_confirm.dart';

/// To pickup (docs/ui-ux.md §4): route + oversized actions, slide-to-confirm
/// for Arrived/Start. `onStart`/`onNoShow` (RideProvider.start/noShow) use
/// the device's real GPS position for the backend's 150m proximity check,
/// falling back to the ride's own pickup point only if the device won't
/// answer — the same fallback scripts/smoke-test.mjs relies on unconditionally
/// since it has no device to ask.
class ToPickupScreen extends StatelessWidget {
  final Ride ride;
  final Future<void> Function() onArrived;
  final Future<void> Function() onStart;
  final Future<void> Function() onNoShow;

  const ToPickupScreen({
    super.key,
    required this.ride,
    required this.onArrived,
    required this.onStart,
    required this.onNoShow,
  });

  bool get _canNoShow {
    final arrivedAt = ride.arrivedAt;
    if (arrivedAt == null) return false;
    return DateTime.now().toUtc().difference(arrivedAt.toUtc()).inMinutes >= 5;
  }

  @override
  Widget build(BuildContext context) {
    final isArriving = ride.status == 'arriving';
    return GlassPanel(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isArriving ? 'Waiting at pickup' : 'Head to pickup',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text('Pickup: ${ride.pickup.lat.toStringAsFixed(5)}, ${ride.pickup.lon.toStringAsFixed(5)}'),
          const SizedBox(height: 20),
          if (!isArriving)
            SlideToConfirm(label: 'Slide when arrived →', onConfirm: onArrived)
          else ...[
            SlideToConfirm(label: 'Slide to start trip →', onConfirm: onStart),
            if (_canNoShow) ...[
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onNoShow, child: const Text('Passenger no-show')),
            ],
          ],
        ],
      ),
    );
  }
}
