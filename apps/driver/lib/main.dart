import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/auth/phone_entry_screen.dart';
import 'screens/home/home_screen.dart';
import 'services/auth_provider.dart';
import 'services/ride_provider.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const DriverApp());
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..bootstrap()),
        ChangeNotifierProxyProvider<AuthProvider, RideProvider>(
          create: (context) => RideProvider(context.read<AuthProvider>()),
          update: (context, auth, previous) => previous ?? RideProvider(auth),
        ),
      ],
      child: MaterialApp(
        title: 'ITMS Driver',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: const AuthGate(),
      ),
    );
  }
}

/// Unlike the Passenger app, drivers are provisioned by an admin with their
/// name already set (POST /v1/drivers) — there's no first-login
/// complete-profile step here, just logged-out vs logged-in.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    switch (auth.status) {
      case AuthStatus.unknown:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case AuthStatus.loggedOut:
        return const PhoneEntryScreen();
      case AuthStatus.loggedIn:
        return const HomeScreen();
    }
  }
}
