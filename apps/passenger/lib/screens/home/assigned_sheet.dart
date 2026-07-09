import 'package:flutter/material.dart';
import '../../services/driver_service.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

/// Driver assigned / arriving (docs/ui-ux.md §3). Shows the driver's public
/// ride-card profile (GET /v1/drivers/:id/public — name, rating, vehicle;
/// no phone/photo are exposed by any API, so this deliberately doesn't fake
/// a photo or a masked-call button that has no backend behind it yet).
class AssignedSheet extends StatefulWidget {
  final String status;
  final String driverId;
  final DriverService driverService;
  final VoidCallback onCancel;

  const AssignedSheet({
    super.key,
    required this.status,
    required this.driverId,
    required this.driverService,
    required this.onCancel,
  });

  @override
  State<AssignedSheet> createState() => _AssignedSheetState();
}

class _AssignedSheetState extends State<AssignedSheet> {
  Map<String, dynamic>? _profile;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AssignedSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.driverId != widget.driverId) _load();
  }

  Future<void> _load() async {
    try {
      final profile = await widget.driverService.publicProfile(widget.driverId);
      if (mounted) setState(() => _profile = profile);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final vehicle = _profile?['vehicle'] as Map<String, dynamic>?;
    final statusText = widget.status == 'arriving' ? 'Your driver is on the way' : 'Driver assigned';

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(statusText, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (_profile != null) ...[
            Row(
              children: [
                const CircleAvatar(radius: 24, child: Icon(Icons.person)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_profile!['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('★ ${_profile!['ratingAvg']}'),
                    ],
                  ),
                ),
                if (vehicle != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.light.secondary,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      vehicle['plateNo'] as String,
                      style: TextStyle(
                        color: AppColors.light.textOnInk,
                        fontFamily: AppFonts.mono,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            if (vehicle != null) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('${vehicle['model']} · ${vehicle['color'] ?? ''}'),
            ),
          ] else if (_error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: LinearProgressIndicator(),
            ),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: widget.onCancel, child: const Text('Cancel ride')),
        ],
      ),
    );
  }
}
