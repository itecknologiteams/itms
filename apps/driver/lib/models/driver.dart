/// Mirrors services/driver/src/entities/driver.entity.ts's JSON shape
/// (GET /v1/drivers/me).
class DriverProfile {
  final String id;
  final String name;
  final String status; // pending | approved | suspended | retired
  final String online; // offline | online | on_trip
  final String? currentVehicleId;
  final String ratingAvg;
  final DateTime? licenseExpiry;

  DriverProfile({
    required this.id,
    required this.name,
    required this.status,
    required this.online,
    required this.currentVehicleId,
    required this.ratingAvg,
    required this.licenseExpiry,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) => DriverProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        status: json['status'] as String,
        online: json['online'] as String,
        currentVehicleId: json['currentVehicleId'] as String?,
        ratingAvg: json['ratingAvg'] as String,
        licenseExpiry:
            json['licenseExpiry'] != null ? DateTime.tryParse(json['licenseExpiry'] as String) : null,
      );

  bool get isApproved => status == 'approved';
  bool get hasVehicle => currentVehicleId != null;
  bool get isOnline => online == 'online' || online == 'on_trip';
}
