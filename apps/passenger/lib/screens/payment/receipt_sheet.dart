import 'package:flutter/material.dart';
import '../../services/api_exception.dart';
import '../../services/payment_service.dart';
import '../../services/ride_provider.dart';
import '../../theme/tokens.dart';
import '../../util/json.dart';
import '../../widgets/glass_panel.dart';

/// Receipt & rating (docs/ui-ux.md §3), shown once a ride is `completed`.
class ReceiptSheet extends StatefulWidget {
  final String rideId;
  final PaymentService paymentService;
  final RideProvider rideProvider;
  final VoidCallback onDone;

  const ReceiptSheet({
    super.key,
    required this.rideId,
    required this.paymentService,
    required this.rideProvider,
    required this.onDone,
  });

  @override
  State<ReceiptSheet> createState() => _ReceiptSheetState();
}

class _ReceiptSheetState extends State<ReceiptSheet> {
  Map<String, dynamic>? _receipt;
  int _stars = 5;
  bool _rated = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    widget.paymentService.receipt(widget.rideId).then((r) {
      if (mounted) setState(() => _receipt = r);
    });
  }

  Future<void> _submitRating() async {
    setState(() => _submitting = true);
    try {
      await widget.rideProvider.rate(_stars);
      if (mounted) setState(() => _rated = true);
    } on ApiException catch (e) {
      if (e.code != 'ALREADY_RATED' && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      } else {
        setState(() => _rated = true);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final amount = parseBigintField(_receipt?['amount_paisa']);
    final method = _receipt?['method'] as String?;

    return GlassPanel(
      tier: GlassTier.modal,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trip complete', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (amount != null) ...[
            Text('Rs ${(amount / 100).toStringAsFixed(2)} paid via ${method ?? '—'}'),
            const SizedBox(height: 16),
          ] else
            const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
          if (!_rated) ...[
            const Text('Rate your ride'),
            Row(
              children: List.generate(5, (i) {
                final filled = i < _stars;
                return IconButton(
                  onPressed: () => setState(() => _stars = i + 1),
                  icon: Icon(filled ? Icons.star : Icons.star_border, color: Colors.amber),
                );
              }),
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submitRating,
                child: _submitting
                    ? SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.light.textOnBrand),
                      )
                    : const Text('Submit rating'),
              ),
            ),
          ] else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(onPressed: widget.onDone, child: const Text('Done')),
            ),
        ],
      ),
    );
  }
}
