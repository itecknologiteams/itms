import 'dart:convert';

/// Reads the `sub` claim (Auth user id) out of a JWT's payload segment
/// without verifying the signature — safe here since it's our own token,
/// just issued to us by Auth over TLS; we're not using it for an
/// authorization decision, only to know our own identity for the
/// driver-room WebSocket join (see RideProvider/RideGateway).
String decodeJwtSubject(String token) {
  final parts = token.split('.');
  if (parts.length != 3) throw const FormatException('Not a JWT');
  final normalized = base64Url.normalize(parts[1]);
  final payload = jsonDecode(utf8.decode(base64Url.decode(normalized))) as Map<String, dynamic>;
  return payload['sub'] as String;
}
