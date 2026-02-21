import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_gemma/flutter_gemma.dart';
import 'screens/home_screen.dart';
import 'theme/eldritch_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize FlutterGemma plugin
  await FlutterGemma.initialize();

  // Lock to portrait mode for mobile
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: EldritchColors.abyss,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const EldritchApp());
}

class EldritchApp extends StatelessWidget {
  const EldritchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eldritch Endless',
      debugShowCheckedModeBanner: false,
      theme: EldritchAppTheme.dark(),
      home: const HomeScreen(),
    );
  }
}
