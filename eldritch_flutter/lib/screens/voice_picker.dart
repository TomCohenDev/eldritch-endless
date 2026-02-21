import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../theme/eldritch_theme.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import '../models/game_state.dart';
import 'story_summary.dart';

class VoicePicker extends StatefulWidget {
  final AncientOne selectedAncientOne;
  final List<Investigator> selectedInvestigators;

  const VoicePicker({
    super.key,
    required this.selectedAncientOne,
    required this.selectedInvestigators,
  });

  @override
  State<VoicePicker> createState() => _VoicePickerState();
}

class _VoicePickerState extends State<VoicePicker> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  NarratorVoice? _selectedVoice;
  String? _playingVoiceId;

  @override
  void initState() {
    super.initState();
    _selectedVoice = NarratorVoice.availableVoices.first;
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _playVoiceSample(NarratorVoice voice) async {
    try {
      if (_playingVoiceId == voice.id) {
        await _audioPlayer.stop();
        setState(() {
          _playingVoiceId = null;
        });
        return;
      }

      setState(() {
        _playingVoiceId = voice.id;
      });

      await _audioPlayer.setAsset(voice.sampleFile);
      await _audioPlayer.play();

      _audioPlayer.playerStateStream.listen((state) {
        if (state.processingState == ProcessingState.completed) {
          if (mounted) {
            setState(() {
              _playingVoiceId = null;
            });
          }
        }
      });
    } catch (e) {
      print('Error playing voice sample: $e');
      setState(() {
        _playingVoiceId = null;
      });
    }
  }

  void _selectVoice(NarratorVoice voice) {
    setState(() {
      _selectedVoice = voice;
    });
  }

  void _proceedToNextStep() {
    if (_selectedVoice == null) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => StorySummary(
          selectedAncientOne: widget.selectedAncientOne,
          selectedInvestigators: widget.selectedInvestigators,
          selectedVoice: _selectedVoice!,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        title: const Text('Choose Narrator'),
        backgroundColor: EldritchColors.leatherDark,
        foregroundColor: EldritchColors.parchmentLight,
      ),
      body: Stack(
        children: [
          const ParchmentBackground(),
          Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(24),
            child: const Column(
              children: [
                Icon(
                  Icons.record_voice_over,
                  size: 48,
                  color: EldritchColors.occultPurple,
                ),
                SizedBox(height: 16),
                Text(
                  'Select a Voice',
                  style: TextStyle(
                    color: EldritchColors.deepInk,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Choose the narrator voice for your story',
                  style: TextStyle(
                    color: EldritchColors.uiNeutral,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Voice options
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: NarratorVoice.availableVoices.length,
              itemBuilder: (context, index) {
                final voice = NarratorVoice.availableVoices[index];
                final isSelected = _selectedVoice?.id == voice.id;
                final isPlaying = _playingVoiceId == voice.id;

                return _VoiceCard(
                  voice: voice,
                  isSelected: isSelected,
                  isPlaying: isPlaying,
                  onTap: () => _selectVoice(voice),
                  onPlayTap: () => _playVoiceSample(voice),
                );
              },
            ),
          ),

          // Continue button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: EldritchColors.parchmentLight.withOpacity(0.5),
              border: Border(
                top: BorderSide(color: EldritchColors.leatherMid.withOpacity(0.3), width: 1),
              ),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _selectedVoice != null ? _proceedToNextStep : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EldritchColors.occultPurple,
                  foregroundColor: EldritchColors.highlightPaper,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'CONTINUE',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
        ],
      ),
    );
  }
}

class _VoiceCard extends StatelessWidget {
  final NarratorVoice voice;
  final bool isSelected;
  final bool isPlaying;
  final VoidCallback onTap;
  final VoidCallback onPlayTap;

  const _VoiceCard({
    required this.voice,
    required this.isSelected,
    required this.isPlaying,
    required this.onTap,
    required this.onPlayTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? EldritchColors.occultPurple : Colors.transparent,
            width: isSelected ? 2.5 : 0,
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Selection indicator
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? EldritchColors.occultPurple : Colors.transparent,
                border: Border.all(
                  color: isSelected ? EldritchColors.occultPurple : EldritchColors.leatherMid,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, color: EldritchColors.highlightPaper, size: 16)
                  : null,
            ),
            const SizedBox(width: 16),

            // Voice info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    voice.name,
                    style: const TextStyle(
                      color: EldritchColors.deepInk,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    voice.description,
                    style: const TextStyle(
                      color: EldritchColors.nearBlackInk,
                      fontSize: 13,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),

            // Play button
            IconButton(
              onPressed: onPlayTap,
              icon: Icon(
                isPlaying ? Icons.stop : Icons.play_arrow,
                color: EldritchColors.occultPurple,
                size: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
