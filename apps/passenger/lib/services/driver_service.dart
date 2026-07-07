import 'api_config.dart';
import 'auth_provider.dart';

class DriverService {
  final AuthProvider auth;
  DriverService(this.auth);

  /// GET /v1/drivers/:id/public — name/rating/vehicle only, no PII.
  Future<Map<String, dynamic>> publicProfile(String driverId) async {
    final client = auth.authenticatedClient(ApiConfig.driverBaseUrl);
    final res = await client.get('/drivers/$driverId/public');
    return res as Map<String, dynamic>;
  }
}
