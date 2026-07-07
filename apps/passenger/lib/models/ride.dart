class LatLon {
  final double lat;
  final double lon;
  const LatLon(this.lat, this.lon);

  Map<String, dynamic> toJson() => {'lat': lat, 'lon': lon};

  factory LatLon.fromJson(Map<String, dynamic> json) =>
      LatLon((json['lat'] as num).toDouble(), (json['lon'] as num).toDouble());
}

/// Mirrors services/ride/src/entities/ride.entity.ts's JSON shape.
class Ride {
  final String id;
  final String status;
  final LatLon pickup;
  final LatLon? dropoff;
  final String? driverId;
  final String? vehicleId;
  final int? farePaisa;
  final double? distanceM;
  final int? durationS;
  final DateTime? startedAt;

  Ride({
    required this.id,
    required this.status,
    required this.pickup,
    this.dropoff,
    this.driverId,
    this.vehicleId,
    this.farePaisa,
    this.distanceM,
    this.durationS,
    this.startedAt,
  });

  factory Ride.fromJson(Map<String, dynamic> json) => Ride(
        id: json['id'] as String,
        status: json['status'] as String,
        pickup: LatLon.fromJson(json['pickupPoint'] as Map<String, dynamic>),
        dropoff: json['dropoffPoint'] != null
            ? LatLon.fromJson(json['dropoffPoint'] as Map<String, dynamic>)
            : null,
        driverId: json['driverId'] as String?,
        vehicleId: json['vehicleId'] as String?,
        farePaisa: json['farePaisa'] as int?,
        distanceM: (json['distanceM'] as num?)?.toDouble(),
        durationS: json['durationS'] as int?,
        startedAt: json['startedAt'] != null ? DateTime.tryParse(json['startedAt'] as String) : null,
      );

  bool get isActive => ![
        'completed',
        'cancelled_by_passenger',
        'cancelled_by_driver',
        'cancelled_no_show',
        'no_driver_found',
      ].contains(status);
}
