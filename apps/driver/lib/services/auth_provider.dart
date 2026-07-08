import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../util/jwt.dart';
import 'api_client.dart';
import 'api_config.dart';

enum AuthStatus { unknown, loggedOut, loggedIn }

/// Phone + OTP auth against the Auth service (docs/security.md §1). Drivers
/// are provisioned by an admin beforehand (POST /v1/drivers), never
/// self-register — so login always uses purpose:"login", and a phone with no
/// existing account surfaces Auth's USER_NOT_FOUND rather than silently
/// creating one (unlike the Passenger app's purpose:"register" flow).
class AuthProvider extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final ApiClient _authApi = ApiClient(ApiConfig.authBaseUrl);

  AuthStatus status = AuthStatus.unknown;
  String? accessToken;
  String? _refreshToken;
  String? phone;
  String? authUserId;

  AuthProvider() {
    _authApi.tokenProvider = () => accessToken;
  }

  ApiClient authenticatedClient(String baseUrl) => ApiClient(baseUrl, tokenProvider: () => accessToken);

  Future<void> bootstrap() async {
    String? token;
    String? refresh;
    String? savedPhone;
    try {
      token = await _storage.read(key: 'access_token');
      refresh = await _storage.read(key: 'refresh_token');
      savedPhone = await _storage.read(key: 'phone');
    } catch (_) {
      // No secure-storage backend available (e.g. widget tests) — fall
      // through to logged-out rather than crash.
    }
    if (token != null && refresh != null) {
      accessToken = token;
      _refreshToken = refresh;
      phone = savedPhone;
      authUserId = decodeJwtSubject(token);
      status = AuthStatus.loggedIn;
    } else {
      status = AuthStatus.loggedOut;
    }
    notifyListeners();
  }

  Future<void> requestOtp(String phone) async {
    await _authApi.post('/auth/otp/request', body: {'phone': phone, 'purpose': 'login'});
  }

  Future<void> verifyOtp(String phone, String code) async {
    final res = await _authApi.post(
      '/auth/otp/verify',
      body: {'phone': phone, 'code': code, 'purpose': 'login'},
    );
    accessToken = res['access'] as String;
    _refreshToken = res['refresh'] as String;
    this.phone = phone;
    authUserId = decodeJwtSubject(accessToken!);
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: _refreshToken);
    await _storage.write(key: 'phone', value: phone);
    status = AuthStatus.loggedIn;
    notifyListeners();
  }

  Future<void> logout() async {
    if (_refreshToken != null) {
      try {
        await _authApi.post('/auth/logout', body: {'refresh_token': _refreshToken});
      } catch (_) {
        // Best-effort — still clear local state below.
      }
    }
    accessToken = null;
    _refreshToken = null;
    phone = null;
    authUserId = null;
    await _storage.deleteAll();
    status = AuthStatus.loggedOut;
    notifyListeners();
  }
}
