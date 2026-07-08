/// Base URLs for each backend service. Ports match infra/docker-compose.yml's
/// host mappings, so the defaults work unmodified against either the Docker
/// stack or the services run natively — same as scripts/smoke-test.mjs.
class ApiConfig {
  static const authBaseUrl =
      String.fromEnvironment('AUTH_BASE_URL', defaultValue: 'http://localhost:3001');
  static const driverBaseUrl =
      String.fromEnvironment('DRIVER_BASE_URL', defaultValue: 'http://localhost:3003');
  static const rideBaseUrl =
      String.fromEnvironment('RIDE_BASE_URL', defaultValue: 'http://localhost:3007');
  static const rideWsUrl =
      String.fromEnvironment('RIDE_WS_URL', defaultValue: 'http://localhost:3007');
  static const paymentBaseUrl =
      String.fromEnvironment('PAYMENT_BASE_URL', defaultValue: 'http://localhost:3009');
}
