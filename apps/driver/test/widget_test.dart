import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver/main.dart';

/// flutter_secure_storage's platform channel has no native implementation in
/// a plain `flutter test` (VM) run, and an unmocked plugin channel call
/// never resolves rather than throwing — which would hang
/// AuthProvider.bootstrap() forever. Mock it to return "no stored value"
/// (null), the same as a fresh install.
void _mockSecureStorage() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestWidgetsFlutterBinding.ensureInitialized();
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, (call) async => null);
}

void main() {
  setUp(_mockSecureStorage);

  testWidgets('shows the phone login screen when logged out', (tester) async {
    await tester.pumpWidget(const DriverApp());
    // Not pumpAndSettle(): the auth-bootstrap spinner is an indeterminate
    // CircularProgressIndicator, which animates forever.
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Driver Sign In'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Mobile number'), findsOneWidget);
  });

  testWidgets('rejects an invalid phone number before calling the API', (tester) async {
    await tester.pumpWidget(const DriverApp());
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    await tester.enterText(find.widgetWithText(TextField, 'Mobile number'), '123');
    await tester.tap(find.text('Send code'));
    await tester.pump();

    expect(find.textContaining('valid number'), findsOneWidget);
  });
}
