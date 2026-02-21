import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../models/game_state.dart';
import '../theme/eldritch_theme.dart';
import 'settings_screen.dart';
import 'ancient_one_picker.dart';
import 'game_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final StorageService _storageService = StorageService();
  List<GameSummary> _savedGames = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedGames();
  }

  Future<void> _loadSavedGames() async {
    final games = await _storageService.listSavedGames();
    setState(() {
      _savedGames = games;
      _isLoading = false;
    });
  }

  void _startNewGame() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const AncientOnePicker(),
      ),
    );
  }

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const SettingsScreen(),
      ),
    );
  }

  Future<void> _continueGame(String gameId) async {
    final game = await _storageService.loadGame(gameId);
    if (game != null && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => GameScreen(initialGameState: game),
        ),
      );
    }
  }

  Future<void> _deleteGame(String gameId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Game'),
        content: const Text('Are you sure you want to delete this saved game?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: EldritchColors.bloodSeal),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _storageService.deleteGame(gameId);
      _loadSavedGames();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Content
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _buildContent(),
          // Settings gear - top right
          Positioned(
            top: 0,
            right: 0,
            child: SafeArea(
              child: IconButton(
                icon: const Icon(Icons.settings, color: Colors.white),
                onPressed: _openSettings,
                tooltip: 'Settings',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Logo/Title area - scaled up so it overflows; scrollable when space is tight
            Expanded(
              flex: 2,
              child: ClipRect(
                clipBehavior: Clip.none,
                child: SingleChildScrollView(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final w = constraints.maxWidth;
                            return Transform.scale(
                              scale: 1.4,
                              child: SizedBox(
                                width: w,
                                child: Image.asset(
                                  'assets/images/title.png',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.auto_awesome,
                                    size: 180,
                                    color: EldritchColors.occultPurple,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 40),
                        const Text(
                          'A Narrative Horror Experience',
                          style: TextStyle(fontSize: 14, color: Colors.white70, letterSpacing: 2),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Buttons
            Expanded(
              flex: 3,
              child: Column(
                children: [
                  // New Game button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _startNewGame,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: EldritchColors.occultPurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'NEW GAME',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Continue Game button / Saved games list
                  if (_savedGames.isNotEmpty) ...[
                    const Text(
                      'CONTINUE',
                      style: TextStyle(fontSize: 14, color: Colors.white70, letterSpacing: 2),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        itemCount: _savedGames.length,
                        itemBuilder: (context, index) {
                          final game = _savedGames[index];
                          return _buildGameCard(game);
                        },
                      ),
                    ),
                  ] else ...[
                    Expanded(
                      child: Center(
                        child: Text(
                          'No saved games',
                          style: context.eldritchType.loreQuote.copyWith(
                            color: Colors.white38,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGameCard(GameSummary game) {
    return Card(
      color: EldritchColors.leatherDark,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          game.name,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _formatDate(game.lastPlayedAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white38,
                    fontSize: 12,
                  ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.white38),
              onPressed: () => _deleteGame(game.id),
            ),
          ],
        ),
        onTap: () => _continueGame(game.id),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'Today';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}
