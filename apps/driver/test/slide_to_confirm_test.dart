import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver/widgets/slide_to_confirm.dart';

void main() {
  testWidgets('tapping the accessible semantics action confirms, same as a full slide', (tester) async {
    final handle = tester.ensureSemantics();
    var confirmed = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SlideToConfirm(
          label: 'Slide to confirm',
          onConfirm: () async => confirmed++,
        ),
      ),
    ));

    // WCAG 2.5.1 requires a non-drag alternative for a drag-only gesture.
    // A real accessibility service invokes this via the semantics action,
    // not a raw pointer gesture — WidgetTester.tap() dispatches a synthetic
    // pointer event through normal hit-testing, which is exactly the
    // interaction the semantics-only onTap is meant to work *without*, so
    // it's invoked directly here the same way an assistive technology would
    // (Flutter Web's engine does this translation itself for `flt-tappable`
    // DOM nodes, which is what the Playwright end-to-end run exercises).
    final node = tester.getSemantics(find.bySemanticsLabel('Slide to confirm'));
    tester.binding.pipelineOwner.semanticsOwner!.performAction(node.id, SemanticsAction.tap);
    await tester.pumpAndSettle();

    expect(confirmed, 1);
    handle.dispose();
  });
}
