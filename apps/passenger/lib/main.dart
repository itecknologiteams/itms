import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/auth/complete_profile_screen.dart';
import 'screens/auth/phone_entry_screen.dart';
import 'screens/home/home_screen.dart';
import 'services/auth_provider.dart';
import 'services/passenger_service.dart';
import 'services/ride_provider.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const PassengerApp());
}

class PassengerApp extends StatelessWidget {
  const PassengerApp({super.key});

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
        title: 'ITMS Passenger',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: const AuthGate(),
      ),
    );
  }
}

/// Root routing decision: unauthenticated -> phone login; authenticated but
/// no Passenger-service profile row yet -> complete-profile; otherwise Home.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool? _profileComplete;
  String? _checkedFor;

  Future<void> _checkProfile(AuthProvider auth) async {
    _checkedFor = auth.accessToken;
    final profile = await PassengerService(auth).me();
    if (mounted) setState(() => _profileComplete = profile != null);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.status == AuthStatus.unknown) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (auth.status == AuthStatus.loggedOut) {
      _profileComplete = null;
      return const PhoneEntryScreen();
    }

    // loggedIn
    if (_checkedFor != auth.accessToken) {
      _checkProfile(auth);
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_profileComplete == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_profileComplete == false) {
      return CompleteProfileScreen(
        passengerService: PassengerService(auth),
        onDone: () => setState(() => _profileComplete = true),
      );
    }
    return const HomeScreen();
  }
}
