import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/tokens.dart';

/// The one sanctioned glass primitive (docs/ui-ux.md §6, mirrors
/// apps/admin's GlassPanel.tsx) — a frosted, translucent surface floating
/// above the map. Compose everything glassy from this instead of hand-rolling
/// blur/opacity per widget.
class GlassPanel extends StatelessWidget {
  final GlassTier tier;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius? borderRadius;

  const GlassPanel({
    super.key,
    this.tier = GlassTier.raised,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final spec = AppGlass.of(tier);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final radius = borderRadius ??
        BorderRadius.circular(tier == GlassTier.modal ? AppRadius.sheet : AppRadius.card);

    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: spec.blur, sigmaY: spec.blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: isDark ? spec.fillDark : spec.fillLight,
            borderRadius: radius,
            border: Border.all(
              color: isDark ? spec.borderDark : spec.borderLight,
              width: 1,
            ),
            boxShadow: const [
              BoxShadow(color: Color(0x1F000000), blurRadius: 32, offset: Offset(0, 8)),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
