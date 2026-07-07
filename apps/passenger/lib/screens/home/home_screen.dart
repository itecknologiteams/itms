import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:provider/provider.dart';
import '../../models/ride.dart';
import '../../services/auth_provider.dart';
import '../../services/driver_service.dart';
import '../../services/geofence_service.dart';
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

const _karachi = ll.LatLng(24.8607, 67.0011);

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  LatLon? _pickup;
  LatLon? _dropoff;
  bool? _inServiceZone;
  final _geofence = GeofenceService();
  late final DriverService _driverService;
  late final PaymentService _paymentService;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _driverService = DriverService(auth);
    _paymentService = PaymentService(auth);
    _checkZone(_karachi.latitude, _karachi.longitude);
  }

  Future<void> _checkZone(double lat, double lon) async {
    try {
      final inZone = await _geofence.isInServiceZone(lat, lon);
      if (mounted) setState(() => _inServiceZone = inZone);
    } catch (_) {
      // Non-critical — the status pill just stays in its "checking" state.
    }
  }

  void _onMapTap(ll.LatLng point) {
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

  @override
  Widget build(BuildContext context) {
    final rideProvider = context.watch<RideProvider>();
    final ride = rideProvider.current;

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(initialCenter: _karachi, initialZoom: 13, onTap: (_, p) => _onMapTap(p)),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.itecknologi.itms.passenger',
              ),
              MarkerLayer(markers: _markers(ride)),
            ],
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

  List<Marker> _markers(Ride? ride) {
    final markers = <Marker>[];
    final pickup = ride?.pickup ?? _pickup;
    final dropoff = ride?.dropoff ?? _dropoff;
    if (pickup != null) {
      markers.add(Marker(
        point: ll.LatLng(pickup.lat, pickup.lon),
        child: Icon(Icons.my_location, color: AppColors.light.primary),
      ));
    }
    if (dropoff != null) {
      markers.add(Marker(
        point: ll.LatLng(dropoff.lat, dropoff.lon),
        child: Icon(Icons.flag, color: AppColors.light.danger),
      ));
    }
    return markers;
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
