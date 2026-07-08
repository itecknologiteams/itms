import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_exception.dart';

/// Thin JSON/HTTP helper shared by every service client. Each backend
/// service is versioned under /v1 (libs/common's global URI versioning).
class ApiClient {
  final String baseUrl;
  String? Function()? tokenProvider;

  ApiClient(this.baseUrl, {this.tokenProvider});

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl/v1$path').replace(queryParameters: query);

  Map<String, String> _headers() {
    final headers = {'content-type': 'application/json'};
    final token = tokenProvider?.call();
    if (token != null) headers['authorization'] = 'Bearer $token';
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await http.get(_uri(path, query), headers: _headers());
    return _handle(res);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final res = await http.post(
      _uri(path),
      headers: _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    final res = await http.patch(
      _uri(path),
      headers: _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  dynamic _handle(http.Response res) {
    final bodyText = res.body.isEmpty ? null : res.body;
    final decoded = bodyText != null ? jsonDecode(bodyText) : null;
    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;
    final error = (decoded is Map) ? decoded['error'] : null;
    throw ApiException(
      statusCode: res.statusCode,
      code: (error is Map ? error['code'] : null) ?? 'UNKNOWN_ERROR',
      message: (error is Map ? error['message'] : null) ?? 'Something went wrong',
    );
  }
}
