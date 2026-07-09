import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/ride_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

/// Ride offer takeover (docs/ui-ux.md §4): full-screen glass/modal over a
/// dimmed background, circular countdown ring, giant Accept/Dismiss.
class OfferOverlay extends StatefulWidget {
  final PendingOffer offer;
  final bool accepting;
  final VoidCallback onAccept;
  final VoidCallback onDismiss;

  const OfferOverlay({
    super.key,
    required this.offer,
    required this.accepting,
    required this.onAccept,
    required this.onDismiss,
  });

  @override
  State<OfferOverlay> createState() => _OfferOverlayState();
}

class _OfferOverlayState extends State<OfferOverlay> {
  late int _secondsLeft = RideProvider.offerWindowSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _secondsLeft = (_secondsLeft - 1).clamp(0, RideProvider.offerWindowSeconds));
      if (_secondsLeft == 0) {
        _timer?.cancel();
        widget.onDismiss();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _secondsLeft / RideProvider.offerWindowSeconds;
    return Positioned.fill(
      child: Container(
        color: AppColors.light.overlayScrim,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: GlassPanel(
              tier: GlassTier.modal,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('New ride request', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: 96,
                    height: 96,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 6,
                          color: AppColors.light.primary,
                          backgroundColor: AppColors.light.borderSubtle,
                        ),
                        Text('$_secondsLeft', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Pickup: ${widget.offer.pickup.lat.toStringAsFixed(4)}, ${widget.offer.pickup.lon.toStringAsFixed(4)}',
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 64,
                    child: ElevatedButton(
                      onPressed: widget.accepting ? null : widget.onAccept,
                      child: widget.accepting
                          ? SizedBox(
                              width: 24, height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.light.textOnBrand),
                            )
                          : const Text('ACCEPT', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: widget.accepting ? null : widget.onDismiss,
                    child: const Text('Dismiss'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
