import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_client.dart';
import 'api_config.dart';

enum AuthStatus { unknown, loggedOut, loggedIn }

/// Phone + OTP auth against the Auth service (docs/security.md §1). Holds the
/// access token in memory and persists both tokens so a refresh survives an
/// app restart. Token refresh-on-expiry isn't wired yet — a real client would
/// intercept 401s and call /auth/token/refresh before failing; out of scope
/// for this first pass (flagged in apps/passenger/README.md).
class AuthProvider extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final ApiClient _authApi = ApiClient(ApiConfig.authBaseUrl);

  AuthStatus status = AuthStatus.unknown;
  String? accessToken;
  String? _refreshToken;
  String? phone;

  AuthProvider() {
    _authApi.tokenProvider = () => accessToken;
  }

  ApiClient authenticatedClient(String baseUrl) {
    final client = ApiClient(baseUrl, tokenProvider: () => accessToken);
    return client;
  }

  Future<void> bootstrap() async {
    String? token;
    String? refresh;
    String? savedPhone;
    try {
      token = await _storage.read(key: 'access_token');
      refresh = await _storage.read(key: 'refresh_token');
      savedPhone = await _storage.read(key: 'phone');
    } catch (_) {
      // No secure-storage backend available (e.g. widget tests run with no
      // platform channel) — fall through to logged-out rather than crash.
    }
    if (token != null && refresh != null) {
      accessToken = token;
      _refreshToken = refresh;
      phone = savedPhone;
      status = AuthStatus.loggedIn;
    } else {
      status = AuthStatus.loggedOut;
    }
    notifyListeners();
  }

  Future<void> requestOtp(String phone) async {
    await _authApi.post('/auth/otp/request', body: {'phone': phone, 'purpose': 'register'});
  }

  Future<void> verifyOtp(String phone, String code) async {
    final res = await _authApi.post(
      '/auth/otp/verify',
      body: {'phone': phone, 'code': code, 'purpose': 'register'},
    );
    accessToken = res['access'] as String;
    _refreshToken = res['refresh'] as String;
    this.phone = phone;
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
    await _storage.deleteAll();
    status = AuthStatus.loggedOut;
    notifyListeners();
  }
}
