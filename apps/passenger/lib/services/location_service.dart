import 'package:geolocator/geolocator.dart';
import '../models/ride.dart';

/// Wraps `geolocator` for the one thing this app needs: "where is the
/// passenger right now" (map center, default pickup, SOS position). Callers
/// must handle a null result — permission can be denied or the browser/OS
/// can refuse to answer, and there's always a sane fallback (tap-to-set,
/// or the ride's own pickup point for SOS).
class LocationService {
  Future<LatLon?> getCurrentPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return null;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      return LatLon(position.latitude, position.longitude);
    } catch (_) {
      return null;
    }
  }
}
