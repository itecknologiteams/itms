import 'package:flutter/material.dart';
import '../../models/ride.dart';
import '../../widgets/glass_panel.dart';

/// "Where to?" sheet shown when there's no active ride (docs/ui-ux.md §3).
/// No fare is ever shown here — it's computed post-ride from time & distance.
class BookingSheet extends StatelessWidget {
  final LatLon? pickup;
  final LatLon? dropoff;
  final bool loading;
  final String? error;
  final VoidCallback onClearPoints;
  final VoidCallback onBook;

  const BookingSheet({
    super.key,
    required this.pickup,
    required this.dropoff,
    required this.loading,
    required this.error,
    required this.onClearPoints,
    required this.onBook,
  });

  String _fmt(LatLon? p) => p == null ? 'Tap the map to set' : '${p.lat.toStringAsFixed(4)}, ${p.lon.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final canBook = pickup != null && !loading;
    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Where to?', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text(
            'Fare is calculated at ride end from time & distance — nothing to pay upfront.',
            style: TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 16),
          _PointRow(icon: Icons.my_location, label: 'Pickup', value: _fmt(pickup)),
          const SizedBox(height: 8),
          _PointRow(icon: Icons.flag_outlined, label: 'Drop-off (optional)', value: _fmt(dropoff)),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(onPressed: onClearPoints, child: const Text('Clear')),
          ),
          if (error != null) ...[
            Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 8),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canBook ? onBook : null,
              child: loading
                  ? const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Book a Ride'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PointRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _PointRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
        Expanded(child: Text(value, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
