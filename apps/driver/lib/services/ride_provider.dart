import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/ride.dart';
import 'api_config.dart';
import 'auth_provider.dart';
import 'location_service.dart';

class PendingOffer {
  final String rideId;
  final LatLon pickup;
  final int round;
  PendingOffer({required this.rideId, required this.pickup, required this.round});
}

/// Manages both the incoming-offer channel and the active ride, for the
/// driver side of the flow. Two socket concerns share this provider:
///  - a `driver:{authUserId}` room (joined once, while online) delivering
///    `ride.offer` pushes relayed from Dispatch by RideGateway — see the
///    backend fix in services/ride/src/rides/ride.gateway.ts.
///  - a `ride:{rideId}` room (joined once a ride is accepted) delivering
///    `ride.state` pushes, e.g. if the passenger cancels while en route.
class RideProvider extends ChangeNotifier {
  final AuthProvider auth;
  io.Socket? _offerSocket;
  io.Socket? _rideSocket;
  Timer? _pollTimer;

  PendingOffer? pendingOffer;
  Ride? current;
  bool loading = false;
  String? error;
  final _location = LocationService();

  RideProvider(this.auth);

  /// Dispatch's default offer window (DISPATCH_OFFER_S) — not carried in the
  /// offer push payload itself, so this is a best-effort client-side
  /// countdown matching the server default; the real enactment is always
  /// server-side (an accept after the window closes gets a 409 OFFER_LOST
  /// regardless of what this countdown shows).
  static const offerWindowSeconds = 15;

  void startListeningForOffers() {
    _offerSocket?.dispose();
    final socket = io.io(
      '${ApiConfig.rideWsUrl}/v1/ws/rides',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setQuery({'driver_id': auth.authUserId!})
          .disableAutoConnect()
          .build(),
    );
    socket.on('ride.offer', (data) {
      final map = data as Map<dynamic, dynamic>;
      pendingOffer = PendingOffer(
        rideId: map['ride_id'] as String,
        pickup: LatLon.fromJson(Map<String, dynamic>.from(map['pickup'] as Map)),
        round: (map['round'] as num).toInt(),
      );
      notifyListeners();
    });
    socket.connect();
    _offerSocket = socket;
  }

  void stopListeningForOffers() {
    _offerSocket?.dispose();
    _offerSocket = null;
    pendingOffer = null;
  }

  void dismissOffer() {
    pendingOffer = null;
    notifyListeners();
  }

  Future<void> acceptOffer(String rideId) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
      final json = await client.post('/rides/$rideId/accept');
      current = Ride.fromJson(json as Map<String, dynamic>);
      pendingOffer = null;
      _connectRideSocket(current!.id);
      _startPolling();
    } catch (e) {
      // Most commonly 409 OFFER_LOST — another driver took it, or the offer
      // window closed. Either way, the offer is stale; clear it.
      pendingOffer = null;
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

  Future<void> arrived() async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/arrived');
    await refresh();
  }

  /// Uses the device's real current position for the backend's 150m pickup
  /// proximity check; falls back to the ride's own pickup point only if the
  /// device won't answer (permission denied, no fix yet), matching what
  /// scripts/smoke-test.mjs does for a headless driver with no GPS at all.
  Future<void> start() async {
    final ride = current;
    if (ride == null) return;
    final position = await _location.getCurrentPosition() ?? ride.pickup;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/start', body: {'position': position.toJson()});
    await refresh();
  }

  Future<void> end() async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/end');
    await refresh();
  }

  Future<void> noShow() async {
    final ride = current;
    if (ride == null) return;
    final position = await _location.getCurrentPosition() ?? ride.pickup;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/no-show', body: {'position': position.toJson()});
    await refresh();
  }

  Future<void> cancel(String reason) async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.rideBaseUrl);
    await client.post('/rides/${ride.id}/cancel', body: {'reason': reason});
    await refresh();
  }

  Future<void> cashReceived() async {
    final ride = current;
    if (ride == null) return;
    final client = auth.authenticatedClient(ApiConfig.paymentBaseUrl);
    await client.post('/payments/rides/${ride.id}/cash-received');
  }

  void clearCurrent() {
    _rideSocket?.dispose();
    _rideSocket = null;
    _pollTimer?.cancel();
    current = null;
    notifyListeners();
  }

  void _connectRideSocket(String rideId) {
    _rideSocket?.dispose();
    final socket = io.io(
      '${ApiConfig.rideWsUrl}/v1/ws/rides',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setQuery({'ride_id': rideId})
          .disableAutoConnect()
          .build(),
    );
    socket.on('ride.state', (_) => refresh().catchError((_) {}));
    socket.on('ride.fare', (_) => refresh().catchError((_) {}));
    socket.connect();
    _rideSocket = socket;
  }

  /// Same reasoning as the Passenger app's RideProvider: the WebSocket push
  /// is a fast path, not the only path, given the documented v1 single-
  /// instance socket.io limitation — poll as a correctness safety net.
  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (current == null || !current!.isActive) {
        _pollTimer?.cancel();
        return;
      }
      refresh().catchError((_) {});
    });
  }

  @override
  void dispose() {
    _offerSocket?.dispose();
    _rideSocket?.dispose();
    _pollTimer?.cancel();
    super.dispose();
  }
}
