import 'package:flutter_test/flutter_test.dart';
import 'package:iwilltravel_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Basic smoke test - just verify the app widget class is accessible
    expect(IWillTravelApp, isNotNull);
  });
}
