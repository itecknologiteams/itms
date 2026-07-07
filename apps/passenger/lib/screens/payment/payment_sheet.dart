import 'package:flutter/material.dart';
import '../../models/ride.dart';
import '../../services/api_exception.dart';
import '../../services/payment_service.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

/// Fare & payment (docs/ui-ux.md §3): big fare numeral, method selector,
/// pay CTA. Cash has no passenger-side action — POST /payments/rides/:id/pay
/// rejects method:"cash" (USE_CASH_RECEIVED, services/payment's own rule);
/// the driver confirms cash on their side and this screen just waits for the
/// ride to flip to `completed` via the ride.state WebSocket push.
class PaymentSheet extends StatefulWidget {
  final Ride ride;
  final PaymentService paymentService;

  const PaymentSheet({super.key, required this.ride, required this.paymentService});

  @override
  State<PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<PaymentSheet> {
  String _method = 'cash';
  bool _paying = false;
  String? _error;

  Future<void> _pay() async {
    setState(() {
      _paying = true;
      _error = null;
    });
    try {
      await widget.paymentService.pay(widget.ride.id, _method);
      // Ride flips to `completed` asynchronously once payment.completed is
      // consumed — the ride.state socket push (see RideProvider) will pick
      // it up; nothing else to do here but wait.
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fare = widget.ride.farePaisa ?? 0;
    final rupees = (fare / 100).toStringAsFixed(2);

    return GlassPanel(
      tier: GlassTier.modal,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fare', style: Theme.of(context).textTheme.titleMedium),
          Text('Rs $rupees', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'cash', label: Text('Cash')),
              ButtonSegment(value: 'jazzcash', label: Text('JazzCash')),
              ButtonSegment(value: 'card', label: Text('Card')),
            ],
            selected: {_method},
            onSelectionChanged: _paying ? null : (s) => setState(() => _method = s.first),
          ),
          const SizedBox(height: 16),
          if (_error != null) ...[
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 8),
          ],
          if (_method == 'cash')
            const Text('Pay your driver directly — they\'ll confirm on their app once received.')
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _paying ? null : _pay,
                child: _paying
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text('Pay Rs $rupees'),
              ),
            ),
        ],
      ),
    );
  }
}
