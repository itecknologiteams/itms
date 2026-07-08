/// Mirrors the shared error envelope every service returns on non-2xx
/// (libs/common's AllExceptionsFilter): {"error": {"code", "message", ...}}.
class ApiException implements Exception {
  final int statusCode;
  final String code;
  final String message;

  ApiException({required this.statusCode, required this.code, required this.message});

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
