import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math' as math;
import '../../../core/constants/app_config.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_tts/flutter_tts.dart';

class OmniLinguistScreen extends StatefulWidget {
  const OmniLinguistScreen({super.key});

  @override
  State<OmniLinguistScreen> createState() => _OmniLinguistScreenState();
}

class _OmniLinguistScreenState extends State<OmniLinguistScreen>
    with TickerProviderStateMixin {
  // Modes: 'text', 'voice'
  String _activeMode = 'voice';

  // Language state
  String _sourceLang = 'en';
  String _targetLang = 'es';

  // UI state
  bool _isLoading = false;
  String _inputText = '';
  String _translatedText = '';
  String _auraState = 'idle'; // idle | listening | translating | speaking

  // Conversation: which person is active
  String _activeSide = ''; // 'A' or 'B'

  // Animation
  late AnimationController _eqController;
  late AnimationController _pulseController;

  // Speech-to-text
  final SpeechToText _speechToText = SpeechToText();
  bool _speechEnabled = false;

  // TTS
  final FlutterTts _flutterTts = FlutterTts();

  // History
  final List<Map<String, String>> _history = [];

  final _textController = TextEditingController();

  final Map<String, String> _languages = {
    'en': '🇬🇧 English',
    'es': '🇪🇸 Spanish',
    'ja': '🇯🇵 Japanese',
    'ko': '🇰🇷 Korean',
    'fr': '🇫🇷 French',
    'de': '🇩🇪 German',
    'ar': '🇸🇦 Arabic',
    'tr': '🇹🇷 Turkish',
    'it': '🇮🇹 Italian',
    'zh': '🇨🇳 Chinese',
    'ru': '🇷🇺 Russian',
    'pt': '🇵🇹 Portuguese',
  };

  // Map lang code -> BCP47 locale for STT
  final Map<String, String> _locales = {
    'en': 'en-US', 'es': 'es-ES', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'fr': 'fr-FR', 'de': 'de-DE', 'ar': 'ar-SA', 'tr': 'tr-TR',
    'it': 'it-IT', 'zh': 'zh-CN', 'ru': 'ru-RU', 'pt': 'pt-PT',
  };

  // Map lang code -> TTS language tag
  final Map<String, String> _ttsLanguages = {
    'en': 'en-US', 'es': 'es-ES', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'fr': 'fr-FR', 'de': 'de-DE', 'ar': 'ar-SA', 'tr': 'tr-TR',
    'it': 'it-IT', 'zh': 'zh-CN', 'ru': 'ru-RU', 'pt': 'pt-PT',
  };

  @override
  void initState() {
    super.initState();
    _eqController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _initSpeech();
    _initTts();
  }

  void _initSpeech() async {
    _speechEnabled = await _speechToText.initialize(
      onError: (val) => debugPrint('STT Error: $val'),
      onStatus: (val) {
        debugPrint('STT Status: $val');
        if ((val == 'done' || val == 'notListening') && _auraState == 'listening') {
          _stopListening();
        }
      },
    );
    if (mounted) setState(() {});
  }

  void _initTts() async {
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.setPitch(1.0);
    _flutterTts.setCompletionHandler(() {
      if (mounted) setState(() => _auraState = 'idle');
    });
  }

  @override
  void dispose() {
    _eqController.dispose();
    _pulseController.dispose();
    _textController.dispose();
    _speechToText.cancel();
    _flutterTts.stop();
    super.dispose();
  }

  // ── TRANSLATION ──────────────────────────────────────────────────────────────

  Future<void> _translate(String text, {required String fromLang, required String toLang}) async {
    if (text.trim().isEmpty) return;
    setState(() {
      _isLoading = true;
      _translatedText = '';
      _auraState = 'translating';
    });

    try {
      final fromName = _languages[fromLang]?.replaceAll(RegExp(r'[^\x00-\x7F]'), '').trim() ?? fromLang;
      final toName = _languages[toLang]?.replaceAll(RegExp(r'[^\x00-\x7F]'), '').trim() ?? toLang;

      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/api/translate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': text,
          'sourceLang': fromName,
          'targetLang': toName,
          'type': 'translate',
        }),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final result = (data['translatedText'] ?? data['text'] ?? '').toString().trim();

        setState(() {
          _translatedText = result;
          _history.insert(0, {
            'source': text,
            'translated': result,
            'from': fromLang,
            'to': toLang,
          });
          _isLoading = false;
        });

        // Speak the translation
        await _speak(result, toLang);
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Translation error: $e');
      // Fallback: still try TTS with original text
      setState(() {
        _translatedText = '(Translation failed — check your connection)';
        _auraState = 'idle';
        _isLoading = false;
      });
    }
  }

  Future<void> _speak(String text, String langCode) async {
    if (text.isEmpty) return;
    setState(() => _auraState = 'speaking');
    final ttsLang = _ttsLanguages[langCode] ?? 'en-US';
    await _flutterTts.setLanguage(ttsLang);
    await _flutterTts.speak(text);
  }

  // ── VOICE / MIC ──────────────────────────────────────────────────────────────

  Future<void> _startListening(String side) async {
    if (_auraState != 'idle') return;

    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      _showError('Microphone permission denied');
      return;
    }
    if (!_speechEnabled) {
      _showError('Speech recognition not available on this device');
      return;
    }

    // Determine which language to listen in
    final listenLang = side == 'A' ? _sourceLang : _targetLang;
    final locale = _locales[listenLang] ?? 'en-US';

    setState(() {
      _activeSide = side;
      _auraState = 'listening';
      _inputText = '';
      _translatedText = '';
    });

    await _speechToText.listen(
      onResult: (result) {
        if (mounted) {
          setState(() => _inputText = result.recognizedWords);
        }
      },
      localeId: locale,
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
    );
  }

  void _stopListening() async {
    await _speechToText.stop();
    final text = _inputText.trim();
    final side = _activeSide;

    setState(() {
      _activeSide = '';
    });

    if (text.isNotEmpty) {
      // Person A speaks sourceLang → translate to targetLang
      // Person B speaks targetLang → translate to sourceLang
      final fromLang = side == 'A' ? _sourceLang : _targetLang;
      final toLang = side == 'A' ? _targetLang : _sourceLang;
      await _translate(text, fromLang: fromLang, toLang: toLang);
    } else {
      setState(() => _auraState = 'idle');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF03080F),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.8, -0.7),
            radius: 1.5,
            colors: [Color(0x1F00D4FF), Color(0x00000000)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Omni-Linguist',
                          style: GoogleFonts.outfit(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.6,
                          ),
                        ),
                        Text(
                          'Real-time AI Translation',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: const Color(0xFF00D4FF),
                          ),
                        ),
                      ],
                    ),
                    // Mode Switch
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _modeBtn('voice', Icons.record_voice_over_rounded),
                          _modeBtn('text', Icons.text_fields_rounded),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Language Selector
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: _langDropdown(_sourceLang, (v) {
                        if (v != null) setState(() => _sourceLang = v);
                      })),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            final tmp = _sourceLang;
                            _sourceLang = _targetLang;
                            _targetLang = tmp;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF00D4FF).withOpacity(0.1),
                          ),
                          child: const Icon(Icons.swap_horiz_rounded, color: Color(0xFF00D4FF), size: 20),
                        ),
                      ),
                      Expanded(child: _langDropdown(_targetLang, (v) {
                        if (v != null) setState(() => _targetLang = v);
                      })),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    children: [
                      // Main Sphere
                      _buildSphere(),
                      const SizedBox(height: 20),

                      // Interactive area
                      if (_activeMode == 'voice')
                        _buildVoiceMode()
                      else
                        _buildTextMode(),

                      const SizedBox(height: 24),

                      // Translation result display (both modes)
                      if (_translatedText.isNotEmpty || _inputText.isNotEmpty)
                        _buildResultPanel(),

                      const SizedBox(height: 24),

                      // History
                      if (_history.isNotEmpty) _buildHistory(),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _modeBtn(String mode, IconData icon) {
    final active = _activeMode == mode;
    return GestureDetector(
      onTap: () => setState(() {
        _activeMode = mode;
        _translatedText = '';
        _inputText = '';
        _auraState = 'idle';
      }),
      child: AnimatedContainer(
        duration: 200.ms,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF00D4FF) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: active ? const Color(0xFF03080F) : Colors.white54, size: 18),
      ),
    );
  }

  Widget _langDropdown(String current, ValueChanged<String?> onChanged) {
    return DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: current,
        onChanged: onChanged,
        dropdownColor: const Color(0xFF0D1117),
        icon: const Icon(Icons.arrow_drop_down_rounded, color: Colors.white60),
        style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
        isExpanded: true,
        items: _languages.entries.map((e) {
          return DropdownMenuItem<String>(
            value: e.key,
            child: Text(e.value, overflow: TextOverflow.ellipsis),
          );
        }).toList(),
      ),
    );
  }

  // ── SPHERE ────────────────────────────────────────────────────────────────────

  Widget _buildSphere() {
    Color color = const Color(0xFF00D4FF);
    if (_auraState == 'listening') color = const Color(0xFF00FFB3);
    if (_auraState == 'translating') color = const Color(0xFFA855F7);
    if (_auraState == 'speaking') color = const Color(0xFFFF007F);

    final label = switch (_auraState) {
      'listening' => 'LISTENING...',
      'translating' => 'TRANSLATING...',
      'speaking' => 'SPEAKING...',
      _ => 'READY',
    };

    return SizedBox(
      height: 220,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Glow
          AnimatedContainer(
            duration: 600.ms,
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: color.withOpacity(0.4), blurRadius: 60, spreadRadius: 20)],
            ),
          ),

          // Pulse rings when listening
          if (_auraState == 'listening')
            ...List.generate(3, (i) => Container(
              width: 140.0 + (i * 40),
              height: 140.0 + (i * 40),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: color.withOpacity(0.2), width: 1.5),
              ),
            ).animate(onPlay: (c) => c.repeat()).scale(
              begin: const Offset(0.7, 0.7),
              end: const Offset(1.3, 1.3),
              duration: (1200 + i * 200).ms,
              curve: Curves.easeOut,
            ).fadeOut(duration: (1200 + i * 200).ms)),

          // Core Sphere
          AnimatedContainer(
            duration: 400.ms,
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [color, color.withOpacity(0.5), const Color(0xFF03080F)],
                stops: const [0.1, 0.6, 1.0],
              ),
              border: Border.all(color: color.withOpacity(0.5), width: 2),
            ),
            child: Icon(
              switch (_auraState) {
                'listening' => Icons.mic_rounded,
                'translating' => Icons.sync_rounded,
                'speaking' => Icons.volume_up_rounded,
                _ => Icons.translate_rounded,
              },
              color: const Color(0xFF03080F),
              size: 36,
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true))
            .scaleXY(begin: 0.95, end: 1.05, duration: 2.seconds, curve: Curves.easeInOut),

          // Equalizer when speaking
          if (_auraState == 'speaking')
            Positioned(
              bottom: 8,
              child: AnimatedBuilder(
                animation: _eqController,
                builder: (_, __) => Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(10, (i) {
                    final h = 8 + (math.Random(i + 7).nextDouble() * 28 * _eqController.value);
                    return Container(
                      width: 3, height: h,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF007F),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    );
                  }),
                ),
              ),
            ),

          // Status pill
          Positioned(
            top: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color.withOpacity(0.3)),
              ),
              child: Text(label,
                style: GoogleFonts.outfit(
                  color: color, fontWeight: FontWeight.bold,
                  fontSize: 10, letterSpacing: 1.5,
                )),
            ),
          ),
        ],
      ),
    );
  }

  // ── VOICE MODE ────────────────────────────────────────────────────────────────

  Widget _buildVoiceMode() {
    final String srcLabel = _languages[_sourceLang] ?? _sourceLang;
    final String tgtLabel = _languages[_targetLang] ?? _targetLang;
    final bool busy = _auraState != 'idle';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Text(
            'Tap a microphone to speak',
            style: GoogleFonts.outfit(color: Colors.white54, fontSize: 13),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              // Person A
              Expanded(
                child: _micButton(
                  side: 'A',
                  label: srcLabel,
                  color: const Color(0xFF00FFB3),
                  enabled: !busy || _activeSide == 'A',
                ),
              ),
              const SizedBox(width: 16),
              // Person B
              Expanded(
                child: _micButton(
                  side: 'B',
                  label: tgtLabel,
                  color: const Color(0xFFFF007F),
                  enabled: !busy || _activeSide == 'B',
                ),
              ),
            ],
          ),

          // Stop button while listening
          if (_auraState == 'listening') ...[
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _stopListening,
              icon: const Icon(Icons.stop_circle_rounded, color: Colors.white),
              label: Text('Done — Translate Now',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF007F),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ).animate().scale(curve: Curves.easeOutBack),
          ],

          // Live speech preview
          if (_auraState == 'listening' && _inputText.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF00FFB3).withOpacity(0.3)),
              ),
              child: Text(
                _inputText,
                style: GoogleFonts.outfit(color: Colors.white, fontSize: 15, height: 1.5),
              ),
            ).animate().fadeIn(),
          ],
        ],
      ),
    );
  }

  Widget _micButton({required String side, required String label, required Color color, required bool enabled}) {
    final isRecording = _activeSide == side;
    return GestureDetector(
      onTap: enabled
          ? () async {
              if (isRecording) {
                _stopListening();
              } else {
                await _startListening(side);
              }
            }
          : null,
      child: AnimatedContainer(
        duration: 250.ms,
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: isRecording ? color.withOpacity(0.15) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isRecording ? color : Colors.white.withOpacity(0.08),
            width: isRecording ? 2 : 1,
          ),
          boxShadow: isRecording
              ? [BoxShadow(color: color.withOpacity(0.3), blurRadius: 20)]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isRecording ? Icons.mic_rounded : Icons.mic_none_rounded,
              color: isRecording ? color : Colors.white54,
              size: 36,
            ),
            const SizedBox(height: 8),
            Text(
              isRecording ? 'TAP TO STOP' : 'TAP TO SPEAK',
              style: GoogleFonts.outfit(
                color: isRecording ? color : Colors.white38,
                fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label.length > 12 ? label.substring(0, 12) : label,
              style: GoogleFonts.outfit(
                color: isRecording ? Colors.white : Colors.white54,
                fontSize: 12, fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ── TEXT MODE ─────────────────────────────────────────────────────────────────

  Widget _buildTextMode() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          TextField(
            controller: _textController,
            style: const TextStyle(color: Colors.white, fontSize: 16),
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Type text to translate...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              filled: true,
              fillColor: Colors.white.withOpacity(0.04),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF00D4FF), width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: _isLoading
                ? null
                : () async {
                    final text = _textController.text.trim();
                    if (text.isNotEmpty) {
                      setState(() => _inputText = text);
                      await _translate(text, fromLang: _sourceLang, toLang: _targetLang);
                    }
                  },
            icon: _isLoading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.translate_rounded, color: Color(0xFF03080F)),
            label: Text(
              _isLoading ? 'Translating...' : 'Translate & Speak',
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w900,
                color: const Color(0xFF03080F),
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00D4FF),
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }

  // ── RESULT PANEL ──────────────────────────────────────────────────────────────

  Widget _buildResultPanel() {
    final fromLabel = _languages[_sourceLang] ?? _sourceLang;
    final toLabel = _languages[_targetLang] ?? _targetLang;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Original
          if (_inputText.isNotEmpty)
            _resultCard(
              label: fromLabel,
              text: _inputText,
              color: const Color(0xFF00D4FF),
              onSpeak: () => _speak(_inputText, _sourceLang),
            ),

          if (_inputText.isNotEmpty && _translatedText.isNotEmpty)
            const SizedBox(height: 12),

          // Translation
          if (_translatedText.isNotEmpty)
            _resultCard(
              label: toLabel,
              text: _translatedText,
              color: const Color(0xFF00FFB3),
              onSpeak: () => _speak(_translatedText, _targetLang),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05);
  }

  Widget _resultCard({
    required String label,
    required String text,
    required Color color,
    required VoidCallback onSpeak,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label.replaceAll(RegExp(r'[^\x00-\x7F]'), '').trim(),
                style: GoogleFonts.outfit(
                  color: color, fontSize: 10,
                  fontWeight: FontWeight.bold, letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: onSpeak,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.volume_up_rounded, color: color, size: 16),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            text,
            style: GoogleFonts.outfit(
              color: Colors.white, fontSize: 16,
              fontWeight: FontWeight.w600, height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────────

  Widget _buildHistory() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Session History',
                style: GoogleFonts.outfit(
                  fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white54,
                )),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _history.clear()),
                child: Text('Clear',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.white30)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...List.generate(_history.length > 8 ? 8 : _history.length, (i) {
            final log = _history[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.02),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_languages[log['from']] ?? log['from']} → ${_languages[log['to']] ?? log['to']}'
                        .replaceAll(RegExp(r'[^\x00-\x7F]'), '').trim(),
                    style: GoogleFonts.outfit(
                      color: const Color(0xFF00D4FF).withOpacity(0.5),
                      fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(log['source']!,
                    style: GoogleFonts.outfit(color: Colors.white54, fontSize: 13)),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(log['translated']!,
                          style: GoogleFonts.outfit(
                            color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold,
                          )),
                      ),
                      GestureDetector(
                        onTap: () => _speak(log['translated']!, log['to']!),
                        child: const Icon(Icons.volume_up_rounded, color: Colors.white24, size: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate(delay: (i * 30).ms).fadeIn();
          }),
        ],
      ),
    );
  }
}
