import 'package:flutter/material.dart';
import '../theme/tokens.dart';

/// Slide-to-confirm for irreversible driver actions (Arrived / Start / End /
/// Cash received — docs/ui-ux.md §4) — prevents an accidental pocket tap
/// from ending a ride or confirming a payment.
class SlideToConfirm extends StatefulWidget {
  final String label;
  final Color color;
  final Future<void> Function() onConfirm;

  const SlideToConfirm({
    super.key,
    required this.label,
    required this.onConfirm,
    this.color = AppSky.s500,
  });

  @override
  State<SlideToConfirm> createState() => _SlideToConfirmState();
}

class _SlideToConfirmState extends State<SlideToConfirm> {
  double _drag = 0;
  bool _confirming = false;
  static const _thumbSize = 56.0;

  Future<void> _confirmNow() async {
    if (_confirming) return;
    setState(() => _confirming = true);
    await widget.onConfirm();
    if (mounted) setState(() => _confirming = false);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final trackWidth = constraints.maxWidth;
        final maxDrag = trackWidth - _thumbSize;
        // WCAG 2.5.1 (Pointer Gestures) requires a non-drag alternative for
        // any drag-only interaction — a screen reader or switch-access user
        // has no way to perform a horizontal drag. `onTap` here activates
        // the same confirm action a full slide would.
        return Semantics(
          button: true,
          label: widget.label,
          excludeSemantics: true,
          onTap: _confirming ? null : _confirmNow,
          child: Container(
            height: _thumbSize,
            decoration: BoxDecoration(
              color: widget.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Center(
                  child: Text(
                    _confirming ? 'Confirming…' : widget.label,
                    style: TextStyle(
                      fontFamily: AppFonts.sans,
                      color: AppColors.light.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ),
                AnimatedPositioned(
                  duration: _drag == 0 || _drag == maxDrag
                      ? const Duration(milliseconds: 200)
                      : Duration.zero,
                  left: _drag.clamp(0, maxDrag),
                  child: GestureDetector(
                    onHorizontalDragUpdate: _confirming
                        ? null
                        : (details) {
                            setState(() {
                              _drag = (_drag + details.delta.dx).clamp(0, maxDrag);
                            });
                          },
                    onHorizontalDragEnd: _confirming
                        ? null
                        : (_) {
                            if (_drag >= maxDrag * 0.85) {
                              setState(() => _drag = maxDrag);
                              _confirmNow();
                            } else {
                              setState(() => _drag = 0);
                            }
                          },
                    child: Container(
                      width: _thumbSize,
                      height: _thumbSize,
                      decoration: BoxDecoration(
                        color: widget.color,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _confirming ? Icons.check : Icons.arrow_forward,
                        color: AppColors.light.textOnBrand,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
