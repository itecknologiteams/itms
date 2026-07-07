import 'package:flutter/material.dart';
import '../../services/passenger_service.dart';
import '../../widgets/glass_panel.dart';

/// Shown once, right after a passenger's first OTP verification
/// (docs/specs.md P-02) — Passenger service has no row for them yet.
class CompleteProfileScreen extends StatefulWidget {
  final PassengerService passengerService;
  final VoidCallback onDone;
  const CompleteProfileScreen({super.key, required this.passengerService, required this.onDone});

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    final name = _controller.text.trim();
    if (name.length < 2) {
      setState(() => _error = 'Enter your name');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.passengerService.completeProfile(name);
      widget.onDone();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Welcome!', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              const Text("What's your name?"),
              const SizedBox(height: 24),
              GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: _controller,
                      decoration: const InputDecoration(labelText: 'Full name'),
                    ),
                    if (_error != null) ...[
                      Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      const SizedBox(height: 8),
                    ],
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Continue'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
