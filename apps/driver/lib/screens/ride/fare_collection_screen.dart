import 'package:flutter/material.dart';
import '../../models/ride.dart';
import '../../services/api_exception.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/slide_to_confirm.dart';

/// Fare collection (docs/ui-ux.md §4): fare numeral full-width, Cash slide-
/// confirm. If the passenger already paid digitally (JazzCash/Card) before
/// the driver taps this, POST cash-received simply 404s (RIDE_NOT_PAYABLE —
/// nothing left to charge); the ride's own status (watched by the parent
/// screen via socket/poll) will already have moved to `completed` in that
/// case, so this is a rare race rather than a real failure mode.
class FareCollectionScreen extends StatelessWidget {
  final Ride ride;
  final Future<void> Function() onCashReceived;

  const FareCollectionScreen({super.key, required this.ride, required this.onCashReceived});

  @override
  Widget build(BuildContext context) {
    final fare = ride.farePaisa;
    final rupees = fare != null ? (fare / 100).toStringAsFixed(2) : '—';
    return GlassPanel(
      tier: GlassTier.modal,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Collect fare', style: Theme.of(context).textTheme.titleMedium),
          Text(
            'Rs $rupees',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          SlideToConfirm(
            label: 'Slide once cash is received →',
            onConfirm: () async {
              try {
                await onCashReceived();
              } on ApiException catch (e) {
                if (e.code != 'RIDE_NOT_PAYABLE') rethrow;
                // Already paid digitally — nothing to do, status will move on.
              }
            },
          ),
        ],
      ),
    );
  }
}
