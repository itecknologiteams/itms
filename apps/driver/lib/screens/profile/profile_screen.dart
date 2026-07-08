import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../services/driver_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _future = DriverService(auth).publicProfile(auth.authUserId!);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          final profile = snapshot.data;
          final vehicle = profile?['vehicle'] as Map<String, dynamic>?;
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              if (snapshot.connectionState != ConnectionState.done)
                const Center(child: CircularProgressIndicator())
              else ...[
                ListTile(
                  leading: const Icon(Icons.person),
                  title: Text(profile?['name'] as String? ?? '—'),
                  subtitle: Text(auth.phone ?? ''),
                ),
                ListTile(
                  leading: const Icon(Icons.star),
                  title: Text('Rating: ${profile?['ratingAvg'] ?? '—'}'),
                ),
                if (vehicle != null)
                  ListTile(
                    leading: const Icon(Icons.directions_car),
                    title: Text(vehicle['plateNo'] as String),
                    subtitle: Text('${vehicle['model']} · ${vehicle['color'] ?? ''}'),
                  ),
              ],
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) Navigator.of(context).popUntil((r) => r.isFirst);
                },
                child: const Text('Log out'),
              ),
            ],
          );
        },
      ),
    );
  }
}
