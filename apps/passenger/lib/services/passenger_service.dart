import 'api_config.dart';
import 'api_exception.dart';
import 'auth_provider.dart';

class PassengerService {
  final AuthProvider auth;
  PassengerService(this.auth);

  /// Null means the profile hasn't been completed yet (first login).
  Future<Map<String, dynamic>?> me() async {
    final client = auth.authenticatedClient(ApiConfig.passengerBaseUrl);
    try {
      final res = await client.get('/passengers/me');
      return res as Map<String, dynamic>;
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<void> completeProfile(String name) async {
    final client = auth.authenticatedClient(ApiConfig.passengerBaseUrl);
    await client.post('/passengers/me', body: {'name': name});
  }

  Future<List<dynamic>> rideHistory() async {
    final client = auth.authenticatedClient(ApiConfig.passengerBaseUrl);
    final res = await client.get('/passengers/me/rides');
    return res as List<dynamic>;
  }
}
