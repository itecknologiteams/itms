import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import 'glass_panel.dart';

/// Top-of-map "You're in X Zone" pill (docs/ui-ux.md §3 Home/Map screen).
class StatusPill extends StatelessWidget {
  final bool? inServiceZone;
  const StatusPill({super.key, required this.inServiceZone});

  @override
  Widget build(BuildContext context) {
    final label = switch (inServiceZone) {
      null => 'Checking service area…',
      true => "You're in a service zone",
      false => 'Outside service area',
    };
    final color = inServiceZone == false ? AppColors.light.danger : AppColors.light.primary;
    return GlassPanel(
      tier: GlassTier.overlay,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 10, color: color),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
