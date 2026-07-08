import '../models/driver.dart';
import 'api_config.dart';
import 'auth_provider.dart';

class DriverService {
  final AuthProvider auth;
  DriverService(this.auth);

  Future<DriverProfile> me() async {
    final client = auth.authenticatedClient(ApiConfig.driverBaseUrl);
    final json = await client.get('/drivers/me');
    return DriverProfile.fromJson(json as Map<String, dynamic>);
  }

  /// Throws ApiException with `code` one of NOT_APPROVED | NO_VEHICLE_ASSIGNED
  /// | SUSPENDED | LICENSE_EXPIRED (services/driver/src/domain/eligibility.ts)
  /// if `online: true` isn't currently allowed.
  Future<DriverProfile> setOnline(bool online) async {
    final client = auth.authenticatedClient(ApiConfig.driverBaseUrl);
    final json = await client.patch('/drivers/me/status', body: {'online': online});
    return DriverProfile.fromJson(json as Map<String, dynamic>);
  }

  /// { id, name, ratingAvg, vehicle: {plateNo, model, color} | null } — the
  /// only endpoint that exposes vehicle plate/model/color to a non-admin;
  /// call it with our own authUserId to see our own assigned vehicle.
  Future<Map<String, dynamic>> publicProfile(String authUserId) async {
    final client = auth.authenticatedClient(ApiConfig.driverBaseUrl);
    final json = await client.get('/drivers/$authUserId/public');
    return json as Map<String, dynamic>;
  }
}
