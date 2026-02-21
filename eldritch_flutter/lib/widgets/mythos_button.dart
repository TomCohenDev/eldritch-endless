import 'package:flutter/material.dart';
import '../theme/eldritch_theme.dart';

class MythosButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isProcessing;
  final int cardsRemaining;

  const MythosButton({
    super.key,
    required this.onPressed,
    required this.isProcessing,
    required this.cardsRemaining,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: EldritchColors.parchmentWarm.withValues(alpha: 0.85),
      child: SafeArea(
        top: false,
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: isProcessing || cardsRemaining == 0 ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: EldritchColors.ritual,
              foregroundColor: EldritchColors.highlightPaper,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(
                  color: EldritchColors.ritualSoft.withValues(alpha: 0.9),
                ),
              ),
              disabledBackgroundColor: EldritchColors.ritual.withValues(alpha: 0.5),
              disabledForegroundColor: EldritchColors.fadedText,
              elevation: 2,
            ),
            child: isProcessing
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(EldritchColors.highlightPaper),
                        ),
                      ),
                      SizedBox(width: 12),
                      Text('DRAWING MYTHOS...'),
                    ],
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.warning_amber, size: 24),
                      const SizedBox(width: 12),
                      Text(
                        'MYTHOS',
                        style: context.eldritchType.sectionHeader.copyWith(
                          fontSize: 18,
                          letterSpacing: 4,
                          color: EldritchColors.highlightPaper,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: EldritchColors.highlightPaper.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          cardsRemaining.toString(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
