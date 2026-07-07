import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

/// Radar/pulsing state while Dispatch broadcasts to nearby drivers
/// (docs/ui-ux.md §3 "Matching").
class MatchingSheet extends StatefulWidget {
  final VoidCallback onCancel;
  const MatchingSheet({super.key, required this.onCancel});

  @override
  State<MatchingSheet> createState() => _MatchingSheetState();
}

class _MatchingSheetState extends State<MatchingSheet> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: AppMotion.pulse)..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 72,
            width: 72,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => CustomPaint(
                painter: _PulsePainter(_controller.value, AppColors.light.accent),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Contacting nearby drivers…', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          const Text('Expanding search as needed', style: TextStyle(color: Colors.black54)),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: widget.onCancel, child: const Text('Cancel')),
        ],
      ),
    );
  }
}

class _PulsePainter extends CustomPainter {
  final double t;
  final Color color;
  _PulsePainter(this.t, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final maxRadius = size.width / 2;
    for (final phase in [0.0, 0.5]) {
      final progress = (t + phase) % 1.0;
      final radius = maxRadius * progress;
      final opacity = (1 - progress).clamp(0.0, 1.0);
      canvas.drawCircle(
        center,
        radius,
        Paint()..color = color.withOpacity(opacity * 0.5),
      );
    }
    canvas.drawCircle(center, 8, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _PulsePainter oldDelegate) => oldDelegate.t != t;
}
