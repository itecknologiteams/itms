import 'api_client.dart';
import 'api_config.dart';

class GeofenceService {
  final _client = ApiClient(ApiConfig.geofenceBaseUrl);

  /// GET /v1/zones/check is @Public — no auth needed (used by the home
  /// screen's "You're in X Zone" status pill).
  Future<bool> isInServiceZone(double lat, double lon) async {
    final res = await _client.get('/zones/check', query: {
      'lat': lat.toString(),
      'lon': lon.toString(),
    });
    return (res as Map<String, dynamic>)['in_service_zone'] as bool;
  }
}
