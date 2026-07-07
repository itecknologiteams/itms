import 'api_config.dart';
import 'auth_provider.dart';

class PaymentService {
  final AuthProvider auth;
  PaymentService(this.auth);

  /// `cash` is deliberately not accepted here — the driver confirms cash
  /// receipt from their own app (POST /payments/rides/:id/cash-received);
  /// see services/payment/src/payments/payments.controller.ts.
  Future<Map<String, dynamic>> pay(String rideId, String method) async {
    final client = auth.authenticatedClient(ApiConfig.paymentBaseUrl);
    final res = await client.post('/payments/rides/$rideId/pay', body: {'method': method});
    return res as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> receipt(String rideId) async {
    final client = auth.authenticatedClient(ApiConfig.paymentBaseUrl);
    try {
      final res = await client.get('/payments/rides/$rideId/receipt');
      return res as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
