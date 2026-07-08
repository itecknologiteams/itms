import 'package:flutter/material.dart';
import '../../models/ride.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

class TripCompleteScreen extends StatelessWidget {
  final Ride ride;
  final VoidCallback onDone;

  const TripCompleteScreen({super.key, required this.ride, required this.onDone});

  @override
  Widget build(BuildContext context) {
    final fare = ride.farePaisa;
    final rupees = fare != null ? (fare / 100).toStringAsFixed(2) : '—';
    return GlassPanel(
      tier: GlassTier.modal,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 48),
          const SizedBox(height: 8),
          Text('Trip complete', style: Theme.of(context).textTheme.titleLarge),
          Text('Rs $rupees collected'),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(onPressed: onDone, child: const Text('Back to Home')),
          ),
        ],
      ),
    );
  }
}
