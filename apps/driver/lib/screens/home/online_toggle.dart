import 'package:flutter/material.dart';
import '../../models/driver.dart';
import '../../theme/tokens.dart';
import '../../widgets/glass_panel.dart';

const _reasonMessages = {
  'NOT_APPROVED': "Your account hasn't been approved yet — check back after admin review.",
  'NO_VEHICLE_ASSIGNED': "No vehicle assigned to you yet — contact your dispatcher.",
  'SUSPENDED': "Your account is currently suspended.",
  'LICENSE_EXPIRED': "Your license has expired — renew it to go online.",
};

/// Home / Online-Offline toggle (docs/ui-ux.md §4): huge glass toggle,
/// primary-tinted + pulsing when online. Eligibility errors from
/// PATCH /drivers/me/status surface as a specific, actionable reason rather
/// than a generic failure.
class OnlineToggle extends StatelessWidget {
  final DriverProfile? profile;
  final bool loading;
  final String? error;
  final ValueChanged<bool> onToggle;

  const OnlineToggle({
    super.key,
    required this.profile,
    required this.loading,
    required this.error,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final online = profile?.isOnline ?? false;
    final message = error != null ? (_reasonMessages[error] ?? error) : null;

    return GlassPanel(
      tier: online ? GlassTier.raised : GlassTier.overlay,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (message != null) ...[
            Text(message, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            height: 72,
            child: ElevatedButton(
              onPressed: loading ? null : () => onToggle(!online),
              style: ElevatedButton.styleFrom(
                backgroundColor: online ? AppColors.light.primary : Colors.grey.shade400,
              ),
              child: loading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      online ? 'ONLINE — tap to go offline' : 'OFFLINE — tap to go online',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
