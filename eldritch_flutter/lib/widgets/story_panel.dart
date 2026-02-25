import 'package:flutter/material.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';

class StoryPanel extends StatelessWidget {
  final List<Player> players;
  final String? activePlayerId;
  final VoidCallback? onMythos;
  final void Function(String playerId)? onPlayerDeath;
  final VoidCallback? onAddInvestigator;
  final void Function(String title, String description, String playerId)?
      onCustomEvent;

  const StoryPanel({
    super.key,
    required this.players,
    this.activePlayerId,
    this.onMythos,
    this.onPlayerDeath,
    this.onAddInvestigator,
    this.onCustomEvent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      color: EldritchColors.parchmentWarm.withValues(alpha: 0.82),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            child: Text(
              'STORY',
              style: context.eldritchType.menuLabel.copyWith(
                color: EldritchColors.occultPurple,
                fontSize: 6,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              children: [
                _StoryButton(
                  icon: Icons.edit_note,
                  label: 'Custom',
                  onTap: () => _showCustomDialog(context),
                ),
                const SizedBox(height: 4),
                _StoryButton(
                  icon: Icons.dangerous,
                  label: 'Death',
                  onTap: () => _showDeathPicker(context),
                  danger: true,
                ),
                const SizedBox(height: 4),
                _StoryButton(
                  icon: Icons.auto_stories,
                  label: 'Mythos',
                  onTap: () => onMythos?.call(),
                  highlight: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDeathPicker(BuildContext context) {
    final living = players.where((p) => !p.isDead).toList();
    if (living.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No living investigators'),
          backgroundColor: EldritchColors.bloodSeal,
        ),
      );
      return;
    }

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: const Text(
          'Who Has Fallen?',
          style: TextStyle(color: EldritchColors.bloodSeal),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: living
              .map(
                (p) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(
                    Icons.person,
                    color: EldritchColors.parchmentLight,
                    size: 18,
                  ),
                  title: Text(
                    p.displayName,
                    style: const TextStyle(color: EldritchColors.parchmentLight),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _confirmDeath(context, p);
                  },
                ),
              )
              .toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _confirmDeath(BuildContext context, Player player) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: const Text(
          'Investigator Dies',
          style: TextStyle(color: EldritchColors.bloodSeal),
        ),
        content: Text(
          '${player.displayName} has fallen.\n\nAdd a replacement investigator?',
          style: const TextStyle(color: EldritchColors.parchmentLight),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              onPlayerDeath?.call(player.id);
            },
            child: const Text('Just Mark Dead'),
          ),
          TextButton(
            style: TextButton.styleFrom(
                foregroundColor: EldritchColors.bloodSeal),
            onPressed: () {
              Navigator.pop(ctx);
              onPlayerDeath?.call(player.id);
              onAddInvestigator?.call();
            },
            child: const Text('MARK DEAD + ADD NEW'),
          ),
        ],
      ),
    );
  }

  void _showCustomDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final playerId = activePlayerId ?? 'global';

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: const Text(
          'Custom Event',
          style: TextStyle(color: EldritchColors.parchmentLight),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleCtrl,
              style:
                  const TextStyle(color: EldritchColors.parchmentLight),
              decoration: const InputDecoration(
                labelText: 'Title',
                labelStyle: TextStyle(color: EldritchColors.fadedText),
                enabledBorder: UnderlineInputBorder(
                  borderSide:
                      BorderSide(color: EldritchColors.fadedText),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: EldritchColors.ritual),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descCtrl,
              style:
                  const TextStyle(color: EldritchColors.parchmentLight),
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notes',
                labelStyle: TextStyle(color: EldritchColors.fadedText),
                enabledBorder: UnderlineInputBorder(
                  borderSide:
                      BorderSide(color: EldritchColors.fadedText),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: EldritchColors.ritual),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final title = titleCtrl.text.trim();
              if (title.isEmpty) return;
              Navigator.pop(ctx);
              onCustomEvent?.call(
                  title, descCtrl.text.trim(), playerId);
            },
            child: const Text('ADD'),
          ),
        ],
      ),
    );
  }
}

class _StoryButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  final bool highlight;

  const _StoryButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final Color bgColor;
    final Color fgColor;

    if (danger) {
      bgColor = EldritchColors.bloodSeal.withValues(alpha: 0.15);
      fgColor = EldritchColors.bloodSeal;
    } else if (highlight) {
      bgColor = EldritchColors.ritual.withValues(alpha: 0.2);
      fgColor = EldritchColors.ritual;
    } else {
      bgColor = EldritchColors.parchmentLight.withValues(alpha: 0.9);
      fgColor = EldritchColors.fadedText;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: fgColor, size: 20),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: context.eldritchType.menuLabel.copyWith(
                    color: fgColor,
                    fontSize: 9,
                    letterSpacing: 0.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
