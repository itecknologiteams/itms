import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import 'package:provider/provider.dart';
import '../../models/ride.dart';
import '../../services/auth_provider.dart';
import '../../services/driver_service.dart';
import '../../services/geofence_service.dart';
import '../../services/location_service.dart';
import '../../services/payment_service.dart';
import '../../services/ride_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/status_pill.dart';
import '../history/history_screen.dart';
import '../profile/profile_screen.dart';
import 'assigned_sheet.dart';
import 'booking_sheet.dart';
import 'in_trip_sheet.dart';
import 'matching_sheet.dart';
import '../payment/payment_sheet.dart';
import '../payment/receipt_sheet.dart';

const _karachi = LatLng(24.8607, 67.0011);

/// A minimal raster style wrapping the same keyless OSM tiles the app has
/// always used — MapLibre GL for the renderer/API surface, without pulling
/// in a vector tile provider or API key. Encoded as a `data:` URL rather than
/// passed as a raw JSON string: maplibre_gl's web platform hands styleString
/// straight to maplibre-gl-js's `setStyle()`, which always treats a plain
/// string as a URL to fetch rather than inline style JSON (unlike the
/// Android/iOS platforms) — a `data:` URL is a URL the browser resolves
/// locally, so it satisfies that without any network dependency.
final _osmRasterStyle = Uri.dataFromString(
  '''
{
  "version": 8,
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "attribution": "(c) OpenStreetMap contributors"
    }
  },
  "layers": [
    {"id": "osm-tiles", "type": "raster", "source": "osm"}
  ]
}
''',
  mimeType: 'application/json',
  base64: true,
).toString();

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  LatLon? _pickup;
  LatLon? _dropoff;
  bool? _inServiceZone;
  LatLng _center = _karachi;
  MapLibreMapController? _mapController;
  bool _styleReady = false;
  Circle? _pickupCircle;
  Circle? _dropoffCircle;
  final _geofence = GeofenceService();
  final _location = LocationService();
  late final DriverService _driverService;
  late final PaymentService _paymentService;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _driverService = DriverService(auth);
    _paymentService = PaymentService(auth);
    _checkZone(_karachi.latitude, _karachi.longitude);
    _useDeviceLocation();
  }

  /// Best-effort: on success, recenters the map and sets pickup to the
  /// device's real position. If permission is denied or the platform can't
  /// answer, the screen simply stays on the Karachi fallback center and the
  /// tap-to-set flow below still works — no error is surfaced for this.
  Future<void> _useDeviceLocation() async {
    final position = await _location.getCurrentPosition();
    if (position == null || !mounted) return;
    final point = LatLng(position.lat, position.lon);
    setState(() {
      _center = point;
      _pickup ??= position;
    });
    _mapController?.moveCamera(CameraUpdate.newLatLngZoom(point, 15));
    _checkZone(position.lat, position.lon);
  }

  Future<void> _checkZone(double lat, double lon) async {
    try {
      final inZone = await _geofence.isInServiceZone(lat, lon);
      if (mounted) setState(() => _inServiceZone = inZone);
    } catch (_) {
      // Non-critical — the status pill just stays in its "checking" state.
    }
  }

  void _onMapTap(LatLng point) {
    setState(() {
      if (_pickup == null) {
        _pickup = LatLon(point.latitude, point.longitude);
      } else if (_dropoff == null) {
        _dropoff = LatLon(point.latitude, point.longitude);
      } else {
        _pickup = LatLon(point.latitude, point.longitude);
        _dropoff = null;
      }
    });
    _checkZone(point.latitude, point.longitude);
  }

  Future<void> _book(RideProvider rideProvider) async {
    if (_pickup == null) return;
    await rideProvider.requestRide(_pickup!, _dropoff);
  }

  /// MapLibre annotations are imperative (unlike flutter_map's declarative
  /// MarkerLayer), so pickup/dropoff circles are reconciled against current
  /// state after each frame rather than rebuilt as part of the widget tree.
  Future<void> _syncMarkers(Ride? ride) async {
    final controller = _mapController;
    if (controller == null || !_styleReady) return;
    final pickup = ride?.pickup ?? _pickup;
    final dropoff = ride?.dropoff ?? _dropoff;
    await _syncCircle(controller, _pickupCircle, pickup, AppColors.light.primary, (c) => _pickupCircle = c);
    await _syncCircle(controller, _dropoffCircle, dropoff, AppColors.light.danger, (c) => _dropoffCircle = c);
  }

  Future<void> _syncCircle(
    MapLibreMapController controller,
    Circle? existing,
    LatLon? point,
    Color color,
    void Function(Circle?) store,
  ) async {
    if (point == null) {
      if (existing != null) {
        await controller.removeCircle(existing);
        store(null);
      }
      return;
    }
    final target = LatLng(point.lat, point.lon);
    if (existing != null && existing.options.geometry == target) return;
    if (existing != null) await controller.removeCircle(existing);
    final circle = await controller.addCircle(CircleOptions(
      geometry: target,
      circleColor: '#${(color.value & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}',
      circleRadius: 8,
      circleStrokeWidth: 2,
      circleStrokeColor: '#ffffff',
    ));
    store(circle);
  }

  @override
  Widget build(BuildContext context) {
    final rideProvider = context.watch<RideProvider>();
    final ride = rideProvider.current;
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncMarkers(ride));

    return Scaffold(
      body: Stack(
        children: [
          MapLibreMap(
            styleString: _osmRasterStyle,
            initialCameraPosition: CameraPosition(target: _center, zoom: 13),
            onMapCreated: (controller) => _mapController = controller,
            onStyleLoadedCallback: () => setState(() => _styleReady = true),
            onMapClick: (_, point) => _onMapTap(point),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  StatusPill(inServiceZone: _inServiceZone),
                  _MenuButton(onSelect: (v) => _handleMenu(context, v)),
                ],
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SafeArea(top: false, child: _buildSheet(context, rideProvider, ride)),
          ),
        ],
      ),
    );
  }

  Widget _buildSheet(BuildContext context, RideProvider rideProvider, Ride? ride) {
    if (ride == null || !ride.isActive) {
      if (ride != null && ride.status == 'completed') {
        return ReceiptSheet(
          rideId: ride.id,
          paymentService: _paymentService,
          rideProvider: rideProvider,
          onDone: rideProvider.clear,
        );
      }
      return BookingSheet(
        pickup: _pickup,
        dropoff: _dropoff,
        loading: rideProvider.loading,
        error: rideProvider.error,
        onClearPoints: () => setState(() {
          _pickup = null;
          _dropoff = null;
        }),
        onBook: () => _book(rideProvider),
      );
    }

    switch (ride.status) {
      case 'matching':
        return MatchingSheet(onCancel: () => rideProvider.cancel('passenger_cancelled'));
      case 'assigned':
      case 'arriving':
        return AssignedSheet(
          status: ride.status,
          driverId: ride.driverId!,
          driverService: _driverService,
          onCancel: () => rideProvider.cancel('passenger_cancelled'),
        );
      case 'in_progress':
        return InTripSheet(startedAt: ride.startedAt, onSos: rideProvider.sos);
      case 'pending_payment':
        return PaymentSheet(ride: ride, paymentService: _paymentService);
      default:
        return GlassPanel(child: Text('Ride status: ${ride.status}'));
    }
  }

  void _handleMenu(BuildContext context, String value) {
    switch (value) {
      case 'history':
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HistoryScreen()));
      case 'profile':
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
    }
  }
}

class _MenuButton extends StatelessWidget {
  final ValueChanged<String> onSelect;
  const _MenuButton({required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      tier: GlassTier.overlay,
      padding: EdgeInsets.zero,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.menu),
        onSelected: onSelect,
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'history', child: Text('Ride history')),
          PopupMenuItem(value: 'profile', child: Text('Profile')),
        ],
      ),
    );
  }
}
