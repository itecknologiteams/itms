import 'package:flutter/material.dart';
import '../theme/tokens.dart';

/// The one sanctioned panel primitive every screen composes with. Used to
/// be a frosted "liquid glass" blur; now renders the drivver design
/// system's flat white card/sheet — soft cool-tinted shadow, 1px subtle
/// border, generous rounding. Kept the same name/API (including the
/// `GlassTier` vocabulary) so no call site needed to change, only this
/// widget's internals.
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? AppColors.dark : AppColors.light;
    final radius = borderRadius ??
        BorderRadius.circular(tier == GlassTier.modal ? AppRadius.sheet : AppRadius.card);
    final shadow = switch (tier) {
      GlassTier.modal => AppShadows.sheet,
      GlassTier.overlay => AppShadows.sm,
      GlassTier.raised => AppShadows.sm,
    };

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colors.surfaceCard,
        borderRadius: radius,
        border: Border.all(color: colors.borderSubtle, width: 1),
        boxShadow: shadow,
      ),
      child: tier == GlassTier.modal
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: colors.borderSubtle,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                child,
              ],
            )
          : child,
    );
  }
}
