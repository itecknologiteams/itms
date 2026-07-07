import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../services/passenger_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late final PassengerService _service;
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _service = PassengerService(context.read<AuthProvider>());
    _future = _service.rideHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ride history')),
      body: FutureBuilder<List<dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final rides = snapshot.data!;
          if (rides.isEmpty) {
            return const Center(child: Text('No rides yet'));
          }
          return ListView.separated(
            itemCount: rides.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final r = rides[i] as Map<String, dynamic>;
              final farePaisa = r['farePaisa'];
              final fare = farePaisa != null ? (int.parse(farePaisa.toString()) / 100).toStringAsFixed(2) : '—';
              return ListTile(
                title: Text(r['driverName'] as String? ?? 'Ride'),
                subtitle: Text('${r['plateNo'] ?? ''} · ${r['status']}'),
                trailing: Text('Rs $fare'),
              );
            },
          );
        },
      ),
    );
  }
}
