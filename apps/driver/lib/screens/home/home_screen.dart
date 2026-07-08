import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import 'package:provider/provider.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../models/driver.dart';
import '../../services/api_exception.dart';
import '../../services/auth_provider.dart';
import '../../services/driver_service.dart';
import '../../services/location_service.dart';
import '../../services/ride_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';
import '../documents/documents_screen.dart';
import '../earnings/earnings_screen.dart';
import '../profile/profile_screen.dart';
import '../ride/fare_collection_screen.dart';
import '../ride/in_trip_screen.dart';
import '../ride/offer_overlay.dart';
import '../ride/to_pickup_screen.dart';
import '../ride/trip_complete_screen.dart';
import 'online_toggle.dart';

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
  late final DriverService _driverService;
  final _location = LocationService();
  MapLibreMapController? _mapController;
  bool _styleReady = false;
  Circle? _pickupCircle;
  DriverProfile? _profile;
  bool _toggling = false;
  String? _toggleError;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _driverService = DriverService(auth);
    _loadProfile();
    // Listen for offers for the whole time the driver is signed in — cheap,
    // and avoids reconnect races around the online/offline toggle. Only
    // online+eligible drivers are ever included in a dispatch round anyway.
    context.read<RideProvider>().startListeningForOffers();
    _centerOnDeviceLocation();
  }

  /// Best-effort recenter — if permission is denied or the platform can't
  /// answer, the map just stays on the Karachi fallback center.
  Future<void> _centerOnDeviceLocation() async {
    final position = await _location.getCurrentPosition();
    if (position == null || !mounted) return;
    _mapController?.moveCamera(CameraUpdate.newLatLngZoom(LatLng(position.lat, position.lon), 15));
  }

  Future<void> _loadProfile() async {
    final profile = await _driverService.me();
    if (mounted) setState(() => _profile = profile);
  }

  Future<void> _toggleOnline(bool online) async {
    setState(() {
      _toggling = true;
      _toggleError = null;
    });
    try {
      final profile = await _driverService.setOnline(online);
      if (mounted) setState(() => _profile = profile);
    } on ApiException catch (e) {
      if (mounted) setState(() => _toggleError = e.code);
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  void dispose() {
    context.read<RideProvider>().stopListeningForOffers();
    super.dispose();
  }

  /// MapLibre annotations are imperative (unlike flutter_map's declarative
  /// MarkerLayer), so the pickup circle is reconciled against current ride
  /// state after each frame rather than rebuilt as part of the widget tree.
  Future<void> _syncPickupMarker(dynamic ride) async {
    final controller = _mapController;
    if (controller == null || !_styleReady) return;
    final pickup = ride?.pickup;
    if (pickup == null) {
      if (_pickupCircle != null) {
        await controller.removeCircle(_pickupCircle!);
        _pickupCircle = null;
      }
      return;
    }
    final target = LatLng(pickup.lat, pickup.lon);
    if (_pickupCircle != null && _pickupCircle!.options.geometry == target) return;
    if (_pickupCircle != null) await controller.removeCircle(_pickupCircle!);
    _pickupCircle = await controller.addCircle(CircleOptions(
      geometry: target,
      circleColor: '#${(AppColors.light.primary.value & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}',
      circleRadius: 8,
      circleStrokeWidth: 2,
      circleStrokeColor: '#ffffff',
    ));
  }

  @override
  Widget build(BuildContext context) {
    final rideProvider = context.watch<RideProvider>();
    final ride = rideProvider.current;
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncPickupMarker(ride));

    // Screen-awake during an active ride (docs/ui-ux.md §4 driver-mode
    // rules) — a no-op on web, real on Android/iOS.
    if (ride != null && ride.isActive) {
      WakelockPlus.enable();
    } else {
      WakelockPlus.disable();
    }

    return Scaffold(
      body: Stack(
        children: [
          MapLibreMap(
            styleString: _osmRasterStyle,
            initialCameraPosition: const CameraPosition(target: _karachi, zoom: 13),
            onMapCreated: (controller) => _mapController = controller,
            onStyleLoadedCallback: () => setState(() => _styleReady = true),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [_MenuButton(onSelect: (v) => _handleMenu(context, v))],
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SafeArea(top: false, child: _buildBody(rideProvider, ride)),
          ),
          if (rideProvider.pendingOffer != null)
            OfferOverlay(
              offer: rideProvider.pendingOffer!,
              accepting: rideProvider.loading,
              onAccept: () => rideProvider.acceptOffer(rideProvider.pendingOffer!.rideId),
              onDismiss: rideProvider.dismissOffer,
            ),
        ],
      ),
    );
  }

  Widget _buildBody(RideProvider rideProvider, dynamic ride) {
    if (ride == null) {
      return OnlineToggle(
        profile: _profile,
        loading: _toggling,
        error: _toggleError,
        onToggle: _toggleOnline,
      );
    }
    switch (ride.status as String) {
      case 'assigned':
      case 'arriving':
        return ToPickupScreen(
          ride: ride,
          onArrived: rideProvider.arrived,
          onStart: rideProvider.start,
          onNoShow: rideProvider.noShow,
        );
      case 'in_progress':
        return InTripScreen(startedAt: ride.startedAt, onEnd: rideProvider.end);
      case 'pending_payment':
        return FareCollectionScreen(ride: ride, onCashReceived: rideProvider.cashReceived);
      case 'completed':
        return TripCompleteScreen(ride: ride, onDone: rideProvider.clearCurrent);
      default:
        return GlassPanel(child: Text('Ride status: ${ride.status}'));
    }
  }

  void _handleMenu(BuildContext context, String value) {
    switch (value) {
      case 'earnings':
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EarningsScreen()));
      case 'documents':
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DocumentsScreen()));
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
          PopupMenuItem(value: 'earnings', child: Text('Earnings')),
          PopupMenuItem(value: 'documents', child: Text('Documents')),
          PopupMenuItem(value: 'profile', child: Text('Profile')),
        ],
      ),
    );
  }
}
