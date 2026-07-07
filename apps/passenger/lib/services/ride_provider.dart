import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/ride.dart';
import 'api_config.dart';
import 'auth_provider.dart';

/// Tracks the passenger's current active ride, kept in sync via the Ride
/// service's REST API plus its 'ride.state'/'ride.fare' WebSocket push
/// (services/ride/src/rides/ride.gateway.ts). Live driver-position updates
/// aren't emitted by any backend gateway yet (tracking only stores GPS
/// history for post-ride fare distance — see docs/ui-ux.md's "live car
/// marker" note), so the map only ever shows pickup/dropoff pins, not a
/// moving vehicle. Documented gap, not something faked here.
class RideProvider extends ChangeNotifier {
  final AuthProvider auth;
  Ride? current;
  io.Socket? _socket;
  bool loading = false;
  String? error;

  RideProvider(this.auth);

  Future<void> requestRide(LatLon pickup, LatLon? dropoff) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
      final json = await client.post('/rides', body: {
        'pickup': pickup.toJson(),
        if (dropoff != null) 'dropoff': dropoff.toJson(),
      });
      current = Ride.fromJson(json as Map<String, dynamic>);
      _connectSocket(current!.id);
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    final json = await client.get('/rides/${ride.id}');
    current = Ride.fromJson(json as Map<String, dynamic>);
    notifyListeners();
  }

  /// The app has no live GPS wired up (documented gap — see class doc), so
  /// this reports the ride's pickup point rather than a fabricated live
  /// position; a real build must not send a made-up coordinate for a safety
  /// feature.
  Future<void> sos() async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/sos', body: {'position': ride.pickup.toJson()});
  }

  Future<void> cancel(String reason) async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/cancel', body: {'reason': reason});
    await refresh();
  }

  Future<void> rate(int stars, {String? comment}) async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/rating', body: {
      'stars': stars,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
  }

  void clear() {
    _socket?.dispose();
    _socket = null;
    current = null;
    notifyListeners();
  }

  void _connectSocket(String rideId) {
    _socket?.dispose();
    final socket = io.io(
      '${ApiConfig.rideWsUrl}/v1/ws/rides',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setQuery({'ride_id': rideId})
          .disableAutoConnect()
          .build(),
    );
    socket.onConnect((_) {});
    socket.on('ride.state', (_) => refresh());
    socket.on('ride.fare', (_) => refresh());
    socket.connect();
    _socket = socket;
  }

  @override
  void dispose() {
    _socket?.dispose();
    super.dispose();
  }
}
