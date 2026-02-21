import 'package:flutter_test/flutter_test.dart';
import 'package:eldritch_flutter/main.dart';

void main() {
  testWidgets('App loads home screen', (WidgetTester tester) async {
    await tester.pumpWidget(const EldritchApp());

    // Verify home screen elements are shown
    expect(find.text('ELDRITCH ENDLESS'), findsOneWidget);
    expect(find.text('NEW GAME'), findsOneWidget);
  });
}
